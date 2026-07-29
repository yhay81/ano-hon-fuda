import { Hono } from "hono";
import type { Context } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import { CasePage, GuidePage, HomePage, ManagePage, NotFoundPage, PrivacyPage } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

type AppContext = Context<{ Bindings: Bindings; Variables: { requestId: string } }>;
type CaseStatus = "hidden" | "open" | "solved";
type CaseKind = "manga" | "novel" | "other" | "picture" | "reference";
type SuggestionVerdict = "checking" | "correct" | "hidden" | "new" | "not_it";

type CaseRow = {
  already_tried: string;
  cover_hint: string;
  created_at: number;
  creator_session_id: string;
  expires_at: number;
  id: string;
  kind: CaseKind;
  memory_text: string;
  memory_title: string;
  owner_token_hash: string;
  read_when: string;
  read_where: string;
  status: CaseStatus;
};

type SuggestionRow = {
  author: string;
  created_at: number;
  evidence_url: string;
  id: string;
  reason: string;
  title: string;
  updated_at: number;
  verdict: SuggestionVerdict;
};

class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 429,
  ) {
    super(code);
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: { requestId: string } }>();
const idPattern = /^[0-9a-f]{32}$/i;
const secretPattern = /^[0-9a-f]{64}$/i;
const browserSessionPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const caseKinds = new Set<CaseKind>(["manga", "novel", "other", "picture", "reference"]);
const suggestionVerdicts = new Set<SuggestionVerdict>([
  "checking",
  "correct",
  "hidden",
  "new",
  "not_it",
]);
const reportReasons = new Set(["spam", "unsafe", "other"]);
const telemetryNames = new Set([
  "visited",
  "case_created",
  "link_copied",
  "suggestion_saved",
  "owner_opened",
  "case_solved",
  "case_deleted",
  "returned",
]);
const blockedLinkPattern =
  /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|jp|io|app|dev)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;

const randomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sameHash = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const jstDay = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const cleanup = (db: D1Database) =>
  db.batch([
    db.prepare("DELETE FROM cases WHERE expires_at <= unixepoch()"),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (45 * 86400)"),
  ]);

const enforceSameOrigin = (c: AppContext) => {
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw new ApiError("cross_site_request", 403);
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    throw new ApiError("cross_site_request", 403);
  }
};

const parseJson = async (c: AppContext, maximumBytes: number) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > maximumBytes) throw new ApiError("payload_too_large", 413);
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
};

const cleanText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC"))
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
};

const cleanParagraph = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC").replaceAll(/\r\n?/g, "\n"))
    .map((character) => {
      const code = character.charCodeAt(0);
      return (code < 32 && character !== "\n") || code === 127 ? " " : character;
    })
    .join("")
    .replaceAll(/[^\S\n]+/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximumLength);
};

const parseEvidenceUrl = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 500) {
    throw new ApiError("invalid_suggestion", 400);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError("invalid_suggestion", 400);
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    hostname.length > 253 ||
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".test") ||
    hostname.includes(":") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    throw new ApiError("invalid_suggestion", 400);
  }
  url.hash = "";
  return url.toString();
};

const getCase = (db: D1Database, caseId: string) =>
  db
    .prepare(
      `SELECT id, owner_token_hash, creator_session_id, memory_title, kind,
        read_when, read_where, cover_hint, memory_text, already_tried,
        status, created_at, expires_at
       FROM cases WHERE id = ? AND expires_at > unixepoch()`,
    )
    .bind(caseId)
    .first<CaseRow>();

const bearerToken = (c: AppContext) => {
  const authorization = c.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secretPattern.test(token)) throw new ApiError("access_denied", 403);
  return token;
};

const requireOwner = async (c: AppContext, caseId: string) => {
  const token = bearerToken(c);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase || !sameHash(await sha256(token), foundCase.owner_token_hash)) {
    throw new ApiError("access_denied", 403);
  }
  return foundCase;
};

const getSuggestions = async (db: D1Database, caseId: string, includeHidden = false) => {
  const rows = await db
    .prepare(
      `SELECT id, title, author, evidence_url, reason, verdict, created_at, updated_at
       FROM suggestions
       WHERE case_id = ? ${includeHidden ? "" : "AND verdict <> 'hidden'"}
       ORDER BY
         CASE verdict
           WHEN 'correct' THEN 0
           WHEN 'checking' THEN 1
           WHEN 'new' THEN 2
           WHEN 'not_it' THEN 3
           ELSE 4
         END,
         updated_at DESC`,
    )
    .bind(caseId)
    .all<SuggestionRow>();
  return rows.results.map((row) => ({
    author: row.author,
    createdAt: Number(row.created_at),
    evidenceUrl: row.evidence_url,
    id: row.id,
    reason: row.reason,
    title: row.title,
    updatedAt: Number(row.updated_at),
    verdict: row.verdict,
  }));
};

const publicCase = async (db: D1Database, foundCase: CaseRow, includeHidden = false) => ({
  alreadyTried: foundCase.already_tried,
  coverHint: foundCase.cover_hint,
  createdAt: Number(foundCase.created_at),
  id: foundCase.id,
  kind: foundCase.kind,
  memoryText: foundCase.memory_text,
  memoryTitle: foundCase.memory_title,
  readWhen: foundCase.read_when,
  readWhere: foundCase.read_where,
  status: foundCase.status,
  suggestions: await getSuggestions(db, foundCase.id, includeHidden),
});

const isAutomatedQa = (c: AppContext) => {
  if (c.req.header("x-automated-qa") === "1") return true;
  const referer = c.req.header("referer");
  if (!referer) return false;
  try {
    return new URL(referer).searchParams.get("qa") === "1";
  } catch {
    return false;
  }
};

const noStore = (c: AppContext) => {
  c.header("Cache-Control", "private, no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
};

const recordEvent = async (db: D1Database, sessionId: string, name: string, context: string) => {
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO product_events
         (session_id, name, context, occurred_on, created_at)
         VALUES (?, ?, ?, ?, unixepoch())`,
      )
      .bind(sessionId, name, context, jstDay()),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (45 * 86400)"),
  ]);
};

const containsBlockedLink = (...values: string[]) =>
  values.some((value) => value && blockedLinkPattern.test(value));

app.use("*", requestId());
app.use("*", securityHeaders);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  await next();
});

app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<HomePage />);
});
app.get("/guide", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<GuidePage />);
});
app.get("/privacy", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<PrivacyPage />);
});
app.get("/c/:id", async (c) => {
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) return c.html(<NotFoundPage />, 404);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase || foundCase.status === "hidden") return c.html(<NotFoundPage />, 404);
  noStore(c);
  return c.html(<CasePage caseId={foundCase.id} memoryTitle={foundCase.memory_title} />);
});
app.get("/manage/:id", async (c) => {
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) return c.html(<NotFoundPage />, 404);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase) return c.html(<NotFoundPage />, 404);
  noStore(c);
  return c.html(<ManagePage caseId={foundCase.id} />);
});

app.post("/api/cases", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 8192);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_case", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const memoryTitle = cleanText(source.memoryTitle, 80);
  const kind = typeof source.kind === "string" ? (source.kind as CaseKind) : "other";
  const readWhen = cleanText(source.readWhen, 80);
  const readWhere = cleanText(source.readWhere, 80);
  const coverHint = cleanParagraph(source.coverHint, 200);
  const memoryText = cleanParagraph(source.memoryText, 1000);
  const alreadyTried = cleanParagraph(source.alreadyTried, 240);
  const website = cleanText(source.website, 100);
  if (
    !browserSessionPattern.test(sessionId) ||
    !memoryTitle ||
    !caseKinds.has(kind) ||
    !readWhen ||
    memoryText.length < 20 ||
    source.ownership !== true ||
    website ||
    containsBlockedLink(memoryTitle, readWhen, readWhere, coverHint, memoryText, alreadyTried)
  ) {
    throw new ApiError("invalid_case", 400);
  }
  if (!isAutomatedQa(c)) {
    const todayStart = Math.floor(Date.parse(`${jstDay()}T00:00:00+09:00`) / 1000);
    const recent = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM cases WHERE creator_session_id = ? AND created_at >= ?",
    )
      .bind(sessionId, todayStart)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 5) throw new ApiError("rate_limited", 429);
  }
  const caseId = randomHex(16);
  const ownerToken = randomHex(32);
  await c.env.DB.prepare(
    `INSERT INTO cases (
      id, owner_token_hash, creator_session_id, memory_title, kind,
      read_when, read_where, cover_hint, memory_text, already_tried,
      status, created_at, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', unixepoch(), unixepoch(), unixepoch() + (180 * 86400))`,
  )
    .bind(
      caseId,
      await sha256(ownerToken),
      sessionId,
      memoryTitle,
      kind,
      readWhen,
      readWhere,
      coverHint,
      memoryText,
      alreadyTried,
    )
    .run();
  if (!isAutomatedQa(c)) await recordEvent(c.env.DB, sessionId, "case_created", caseId);
  const origin = new URL(c.req.url).origin;
  return c.json(
    {
      caseId,
      manageUrl: `${origin}/manage/${caseId}#owner=${ownerToken}`,
      ownerToken,
      publicUrl: `${origin}/c/${caseId}`,
    },
    201,
  );
});

app.get("/api/cases/:id", async (c) => {
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) throw new ApiError("not_found", 404);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase || foundCase.status === "hidden") throw new ApiError("not_found", 404);
  return c.json(await publicCase(c.env.DB, foundCase));
});

app.post("/api/cases/:id/suggestions", async (c) => {
  enforceSameOrigin(c);
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) throw new ApiError("not_found", 404);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase || foundCase.status === "hidden") throw new ApiError("not_found", 404);
  if (foundCase.status === "solved") throw new ApiError("case_solved", 409);
  const payload = await parseJson(c, 2048);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_suggestion", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const title = cleanText(source.title, 120);
  const author = cleanText(source.author, 80);
  const evidenceUrl = parseEvidenceUrl(source.evidenceUrl);
  const reason = cleanParagraph(source.reason, 300);
  const website = cleanText(source.website, 100);
  if (
    !browserSessionPattern.test(sessionId) ||
    !title ||
    website ||
    containsBlockedLink(title, author, reason)
  ) {
    throw new ApiError("invalid_suggestion", 400);
  }
  const today = jstDay();
  const capacity = await c.env.DB.prepare(
    `SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN session_id = ? AND occurred_on = ? THEN 1 END) AS own
     FROM suggestions WHERE case_id = ?`,
  )
    .bind(sessionId, today, caseId)
    .first<{ own: number; total: number }>();
  if (Number(capacity?.total ?? 0) >= 200 && Number(capacity?.own ?? 0) === 0) {
    throw new ApiError("case_full", 429);
  }
  await c.env.DB.prepare(
    `INSERT INTO suggestions (
      id, case_id, session_id, title, author, evidence_url, reason,
      verdict, occurred_on, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, unixepoch(), unixepoch())
    ON CONFLICT(case_id, session_id, occurred_on)
    DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      evidence_url = excluded.evidence_url,
      reason = excluded.reason,
      verdict = 'new',
      updated_at = unixepoch()`,
  )
    .bind(randomHex(16), caseId, sessionId, title, author, evidenceUrl, reason, today)
    .run();
  if (!isAutomatedQa(c)) {
    await recordEvent(c.env.DB, sessionId, "suggestion_saved", caseId);
  }
  return c.json({ saved: true, suggestions: await getSuggestions(c.env.DB, caseId) });
});

app.get("/api/cases/:id/manage", async (c) => {
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) throw new ApiError("access_denied", 403);
  const foundCase = await requireOwner(c, caseId);
  return c.json(await publicCase(c.env.DB, foundCase, true));
});

app.patch("/api/cases/:id/suggestions/:suggestionId", async (c) => {
  enforceSameOrigin(c);
  const caseId = c.req.param("id");
  const suggestionId = c.req.param("suggestionId");
  if (!idPattern.test(caseId) || !idPattern.test(suggestionId)) {
    throw new ApiError("access_denied", 403);
  }
  const foundCase = await requireOwner(c, caseId);
  const payload = await parseJson(c, 512);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_verdict", 400);
  const source = payload as Record<string, unknown>;
  const verdict =
    typeof source.verdict === "string" ? (source.verdict as SuggestionVerdict) : "new";
  if (!suggestionVerdicts.has(verdict) || verdict === "new") {
    throw new ApiError("invalid_verdict", 400);
  }
  const suggestion = await c.env.DB.prepare(
    "SELECT id FROM suggestions WHERE id = ? AND case_id = ?",
  )
    .bind(suggestionId, caseId)
    .first<{ id: string }>();
  if (!suggestion) throw new ApiError("not_found", 404);

  const statements = [
    c.env.DB.prepare(
      "UPDATE suggestions SET verdict = ?, updated_at = unixepoch() WHERE id = ? AND case_id = ?",
    ).bind(verdict, suggestionId, caseId),
  ];
  if (verdict === "correct") {
    statements.push(
      c.env.DB.prepare(
        `UPDATE suggestions SET verdict = 'checking', updated_at = unixepoch()
           WHERE case_id = ? AND id <> ? AND verdict = 'correct'`,
      ).bind(caseId, suggestionId),
    );
  }
  statements.push(
    c.env.DB.prepare(
      `UPDATE cases
         SET status = CASE
           WHEN status = 'hidden' THEN 'hidden'
           WHEN EXISTS (
             SELECT 1 FROM suggestions WHERE case_id = ? AND verdict = 'correct'
           ) THEN 'solved'
           ELSE 'open'
         END,
         updated_at = unixepoch()
         WHERE id = ?`,
    ).bind(caseId, caseId),
  );
  await c.env.DB.batch(statements);
  if (verdict === "correct" && !isAutomatedQa(c)) {
    await recordEvent(c.env.DB, foundCase.creator_session_id, "case_solved", caseId);
  }
  const updatedCase = await getCase(c.env.DB, caseId);
  if (!updatedCase) throw new ApiError("not_found", 404);
  return c.json(await publicCase(c.env.DB, updatedCase, true));
});

app.delete("/api/cases/:id", async (c) => {
  enforceSameOrigin(c);
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) throw new ApiError("access_denied", 403);
  await requireOwner(c, caseId);
  await c.env.DB.prepare("DELETE FROM cases WHERE id = ?").bind(caseId).run();
  return c.body(null, 204);
});

app.post("/api/cases/:id/report", async (c) => {
  enforceSameOrigin(c);
  const caseId = c.req.param("id");
  if (!idPattern.test(caseId)) throw new ApiError("not_found", 404);
  const foundCase = await getCase(c.env.DB, caseId);
  if (!foundCase || foundCase.status === "hidden") throw new ApiError("not_found", 404);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_report", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const reason = typeof source.reason === "string" ? source.reason : "";
  if (!browserSessionPattern.test(sessionId) || !reportReasons.has(reason)) {
    throw new ApiError("invalid_report", 400);
  }
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO reports (case_id, reporter_session_id, reason, created_at)
     VALUES (?, ?, ?, unixepoch())`,
  )
    .bind(caseId, sessionId, reason)
    .run();
  const reports = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE case_id = ?")
    .bind(caseId)
    .first<{ count: number }>();
  if (Number(reports?.count ?? 0) >= 3) {
    await c.env.DB.prepare(
      "UPDATE cases SET status = 'hidden', updated_at = unixepoch() WHERE id = ?",
    )
      .bind(caseId)
      .run();
  }
  return c.json({ received: true });
});

app.post("/api/telemetry", async (c) => {
  enforceSameOrigin(c);
  if (isAutomatedQa(c)) return c.body(null, 204);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_telemetry", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const name = typeof source.name === "string" ? source.name : "";
  const context = cleanText(source.context, 32);
  if (
    !browserSessionPattern.test(sessionId) ||
    !telemetryNames.has(name) ||
    (context !== "" && context !== "home" && !idPattern.test(context))
  ) {
    throw new ApiError("invalid_telemetry", 400);
  }
  await recordEvent(c.env.DB, sessionId, name, context);
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({ healthy: true, service: "ano-hon-fuda", time: new Date().toISOString() }),
);

app.notFound((c) => {
  if (c.req.method === "GET" && !c.req.path.startsWith("/api/")) {
    return c.html(<NotFoundPage />, 404);
  }
  return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, requestId: c.get("requestId") }, error.status);
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export { app };
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
};
