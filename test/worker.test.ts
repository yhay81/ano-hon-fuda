import { describe, expect, it, vi } from "vitest";

import { app, type Bindings } from "../src/worker";

const caseId = "a".repeat(32);
const suggestionId = "b".repeat(32);
const ownerToken = "1".repeat(64);
const ownerHash = "3138bb9bc78df27c473ecfd1410f7bd45ebac1f59cf3ff9cfe4db77aab7aedd3";
const sessionId = "21d6f5db-2a77-4dd2-8319-e45fe918e687";
const responderSessionId = "38b80262-aaf5-4cf4-91f7-4dc052f9f08e";
const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

type CaseStatus = "hidden" | "open" | "solved";
type SuggestionVerdict = "checking" | "correct" | "hidden" | "new" | "not_it";

type StoredCase = {
  already_tried: string;
  cover_hint: string;
  created_at: number;
  creator_session_id: string;
  expires_at: number;
  id: string;
  kind: "novel";
  memory_text: string;
  memory_title: string;
  owner_token_hash: string;
  read_when: string;
  read_where: string;
  status: CaseStatus;
};

type StoredSuggestion = {
  author: string;
  case_id: string;
  created_at: number;
  evidence_url: string;
  id: string;
  occurred_on: string;
  reason: string;
  session_id: string;
  title: string;
  updated_at: number;
  verdict: SuggestionVerdict;
};

type TestState = {
  foundCase: StoredCase | null;
  recentCases: number;
  reportSessions: Set<string>;
  suggestions: StoredSuggestion[];
};

type Call = {
  arguments: unknown[];
  sql: string;
};

const defaultState = (): TestState => ({
  foundCase: {
    already_tried: "図書館で月と船を検索しました",
    cover_hint: "青い夜空と銀色の細い線",
    created_at: 1_721_000_000,
    creator_session_id: sessionId,
    expires_at: 4_102_444_800,
    id: caseId,
    kind: "novel",
    memory_text: "主人公が月を小さな船に載せ、最後に朝の港へ戻ります。",
    memory_title: "学校の図書室で読んだ青い本",
    owner_token_hash: ownerHash,
    read_when: "2000年代前半、小学生のころ",
    read_where: "学校の図書室",
    status: "open",
  },
  recentCases: 0,
  reportSessions: new Set(),
  suggestions: [
    {
      author: "架空 花子",
      case_id: caseId,
      created_at: 1_721_000_100,
      evidence_url: "https://books.example.com/moon",
      id: suggestionId,
      occurred_on: today,
      reason: "月を運ぶ船の場面が一致します",
      session_id: responderSessionId,
      title: "月を運ぶ舟",
      updated_at: 1_721_000_100,
      verdict: "new",
    },
  ],
});

const makeBindings = (partial: Partial<TestState> = {}) => {
  const state = { ...defaultState(), ...partial };
  const calls: Call[] = [];
  const prepare = vi.fn((sql: string) => {
    const call: Call = { arguments: [], sql };
    calls.push(call);
    const statement = {
      all: async () => {
        if (sql.includes("FROM suggestions")) {
          const includeHidden = !sql.includes("verdict <> 'hidden'");
          const results = state.suggestions
            .filter(
              (suggestion) =>
                suggestion.case_id === call.arguments[0] &&
                (includeHidden || suggestion.verdict !== "hidden"),
            )
            .map(
              ({ session_id: _sessionId, case_id: _caseId, occurred_on: _day, ...rest }) => rest,
            );
          return { results };
        }
        return { results: [] };
      },
      bind: (...values: unknown[]) => {
        call.arguments = values;
        return statement;
      },
      first: async () => {
        if (sql.includes("COUNT(*) AS count FROM cases")) return { count: state.recentCases };
        if (sql.includes("COUNT(*) AS total") && sql.includes("FROM suggestions")) {
          const relevant = state.suggestions.filter(
            (suggestion) => suggestion.case_id === call.arguments[2],
          );
          return {
            own: relevant.filter(
              (suggestion) =>
                suggestion.session_id === call.arguments[0] &&
                suggestion.occurred_on === call.arguments[1],
            ).length,
            total: relevant.length,
          };
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportSessions.size };
        }
        if (sql.includes("SELECT id FROM suggestions")) {
          const found = state.suggestions.find(
            (suggestion) =>
              suggestion.id === call.arguments[0] && suggestion.case_id === call.arguments[1],
          );
          return found ? { id: found.id } : null;
        }
        if (sql.includes("FROM cases WHERE id")) {
          return state.foundCase?.id === call.arguments[0] ? state.foundCase : null;
        }
        return null;
      },
      raw: async () => [],
      run: async () => {
        if (sql.includes("INSERT INTO cases")) {
          state.foundCase = {
            already_tried: call.arguments[9] as string,
            cover_hint: call.arguments[7] as string,
            created_at: 1_721_000_000,
            creator_session_id: call.arguments[2] as string,
            expires_at: 4_102_444_800,
            id: call.arguments[0] as string,
            kind: call.arguments[4] as "novel",
            memory_text: call.arguments[8] as string,
            memory_title: call.arguments[3] as string,
            owner_token_hash: call.arguments[1] as string,
            read_when: call.arguments[5] as string,
            read_where: call.arguments[6] as string,
            status: "open",
          };
        }
        if (sql.includes("INSERT INTO suggestions")) {
          const existing = state.suggestions.find(
            (suggestion) =>
              suggestion.case_id === call.arguments[1] &&
              suggestion.session_id === call.arguments[2] &&
              suggestion.occurred_on === call.arguments[7],
          );
          if (existing) {
            existing.title = call.arguments[3] as string;
            existing.author = call.arguments[4] as string;
            existing.evidence_url = call.arguments[5] as string;
            existing.reason = call.arguments[6] as string;
            existing.verdict = "new";
          } else {
            state.suggestions.push({
              author: call.arguments[4] as string,
              case_id: call.arguments[1] as string,
              created_at: 1_721_000_200,
              evidence_url: call.arguments[5] as string,
              id: call.arguments[0] as string,
              occurred_on: call.arguments[7] as string,
              reason: call.arguments[6] as string,
              session_id: call.arguments[2] as string,
              title: call.arguments[3] as string,
              updated_at: 1_721_000_200,
              verdict: "new",
            });
          }
        }
        if (sql.includes("INSERT OR IGNORE INTO reports")) {
          state.reportSessions.add(call.arguments[1] as string);
        }
        if (sql.includes("UPDATE cases SET status = 'hidden'") && state.foundCase) {
          state.foundCase.status = "hidden";
        }
        if (sql.includes("UPDATE suggestions SET verdict = ?")) {
          const found = state.suggestions.find(
            (suggestion) =>
              suggestion.id === call.arguments[1] && suggestion.case_id === call.arguments[2],
          );
          if (found) found.verdict = call.arguments[0] as SuggestionVerdict;
        }
        if (sql.includes("id <> ? AND verdict = 'correct'")) {
          for (const suggestion of state.suggestions) {
            if (
              suggestion.case_id === call.arguments[0] &&
              suggestion.id !== call.arguments[1] &&
              suggestion.verdict === "correct"
            ) {
              suggestion.verdict = "checking";
            }
          }
        }
        if (sql.includes("WHEN EXISTS") && state.foundCase && state.foundCase.status !== "hidden") {
          state.foundCase.status = state.suggestions.some(
            (suggestion) =>
              suggestion.case_id === call.arguments[0] && suggestion.verdict === "correct",
          )
            ? "solved"
            : "open";
        }
        if (sql.includes("DELETE FROM cases")) {
          state.foundCase = null;
          state.suggestions = [];
        }
        return { meta: { changes: 1 } };
      },
    };
    return statement as unknown as D1PreparedStatement;
  });
  const db = {
    batch: vi.fn(async (statements: D1PreparedStatement[]) => {
      for (const statement of statements) await statement.run();
      return [];
    }),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
    prepare,
    withSession: vi.fn(),
  } as unknown as D1Database;
  return {
    bindings: {
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      DB: db,
    } satisfies Bindings,
    calls,
    state,
  };
};

const headers = {
  "content-type": "application/json",
  origin: "http://localhost",
  "sec-fetch-site": "same-origin",
};

const validCase = () => ({
  alreadyTried: "図書館で月と船を検索しました",
  coverHint: "青い夜空と銀色の細い線",
  kind: "novel",
  memoryText: "主人公が月を小さな船に載せ、最後に朝の港へ戻ります。",
  memoryTitle: "学校の図書室で読んだ青い本",
  ownership: true,
  readWhen: "2000年代前半、小学生のころ",
  readWhere: "学校の図書室",
  sessionId,
  website: "",
});

const createCase = (bindings: Bindings, body = validCase(), extraHeaders = {}) =>
  app.request(
    "/api/cases",
    {
      body: JSON.stringify(body),
      headers: { ...headers, ...extraHeaders },
      method: "POST",
    },
    bindings,
  );

const submitSuggestion = (
  bindings: Bindings,
  body: Record<string, unknown> = {
    author: "架空 太郎",
    evidenceUrl: "https://library.example.jp/books/moon#detail",
    reason: "月を運ぶ船と朝の港が一致します",
    sessionId,
    title: "月の舟",
    website: "",
  },
) =>
  app.request(
    `/api/cases/${caseId}/suggestions`,
    {
      body: JSON.stringify(body),
      headers,
      method: "POST",
    },
    bindings,
  );

describe("あの本札 worker", () => {
  it("公開ページに製品情報、構造化データ、固有canonicalを返す", async () => {
    const { bindings } = makeBindings();
    for (const path of ["/", "/guide", "/privacy"]) {
      const response = await app.request(path, undefined, bindings);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(html).toContain("あの本札");
      expect(html).toContain("application/ld+json");
      expect(html).toContain(
        `href="https://ano-hon-fuda.yhay81.com${path === "/" ? "" : path}" rel="canonical"`,
      );
      expect(html).not.toMatch(/public validation|success criteria|experiment|仮説|成功条件/i);
    }
  });

  it("共有札と管理画面をnoindex・no-storeにする", async () => {
    const { bindings } = makeBindings();
    for (const path of [`/c/${caseId}`, `/manage/${caseId}`]) {
      const response = await app.request(path, undefined, bindings);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
      expect(html).toContain(`data-case-id="${caseId}"`);
    }
  });

  it("非表示の共有札を公開しないが管理画面は残す", async () => {
    const state = defaultState();
    if (state.foundCase) state.foundCase.status = "hidden";
    const { bindings } = makeBindings(state);
    expect((await app.request(`/c/${caseId}`, undefined, bindings)).status).toBe(404);
    expect((await app.request(`/manage/${caseId}`, undefined, bindings)).status).toBe(200);
  });

  it("公開APIは記憶と候補だけを返し、セッションと管理鍵を返さない", async () => {
    const { bindings } = makeBindings();
    const response = await app.request(`/api/cases/${caseId}`, undefined, bindings);
    const body = await response.json<Record<string, unknown>>();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      memoryTitle: "学校の図書室で読んだ青い本",
      status: "open",
    });
    expect(body.suggestions).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain(responderSessionId);
    expect(JSON.stringify(body)).not.toContain(ownerHash);
    expect(body).not.toHaveProperty("creatorSessionId");
  });

  it("管理鍵をhash化し、fragment付き管理URLを発行する", async () => {
    const { bindings, calls } = makeBindings({ foundCase: null, suggestions: [] });
    const response = await createCase(bindings);
    const body = await response.json<{
      caseId: string;
      manageUrl: string;
      ownerToken: string;
      publicUrl: string;
    }>();
    const insert = calls.find((call) => call.sql.includes("INSERT INTO cases"));
    expect(response.status).toBe(201);
    expect(body.caseId).toMatch(/^[0-9a-f]{32}$/);
    expect(body.ownerToken).toMatch(/^[0-9a-f]{64}$/);
    expect(body.manageUrl).toContain(`#owner=${body.ownerToken}`);
    expect(body.publicUrl).toContain(`/c/${body.caseId}`);
    expect(body.publicUrl).not.toContain(body.ownerToken);
    expect(insert?.arguments).not.toContain(body.ownerToken);
  });

  it("未所有、リンク入り手がかり、越境、作成上限を拒否する", async () => {
    const invalidCases = [
      { ...validCase(), ownership: false },
      { ...validCase(), memoryText: "詳しくは https://evil.example で確認してください" },
      { ...validCase(), readWhere: "reader@example.com へ連絡" },
      { ...validCase(), website: "bot" },
    ];
    for (const body of invalidCases) {
      expect((await createCase(makeBindings().bindings, body)).status).toBe(400);
    }
    expect(
      (
        await createCase(makeBindings().bindings, validCase(), {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect((await createCase(makeBindings({ recentCases: 5 }).bindings)).status).toBe(429);
  });

  it("一端末・一日・一札の候補を書き直せる", async () => {
    const { bindings, state } = makeBindings();
    const response = await submitSuggestion(bindings, {
      author: "別の著者",
      evidenceUrl: "https://library.example.jp/new#fragment",
      reason: "朝の港の場面がより近いです",
      sessionId: responderSessionId,
      title: "朝を運ぶ舟",
      website: "",
    });
    const body = await response.json<{ suggestions: Array<{ evidenceUrl: string }> }>();
    expect(response.status).toBe(200);
    expect(state.suggestions).toHaveLength(1);
    expect(state.suggestions[0]?.title).toBe("朝を運ぶ舟");
    expect(body.suggestions[0]?.evidenceUrl).not.toContain("#");
    expect(JSON.stringify(body)).not.toContain(responderSessionId);
  });

  it("公開HTTPSの確認URLだけを受け付ける", async () => {
    for (const evidenceUrl of [
      "http://library.example.jp/book",
      "https://localhost/book",
      "https://127.0.0.1/book",
      "https://books.internal/book",
      "https://user:pass@books.example.jp/book",
    ]) {
      const response = await submitSuggestion(makeBindings().bindings, {
        author: "",
        evidenceUrl,
        reason: "",
        sessionId,
        title: "月の舟",
        website: "",
      });
      expect(response.status).toBe(400);
    }
  });

  it("200候補で新しい回答者の受付を止める", async () => {
    const suggestions = Array.from({ length: 200 }, (_, index) => ({
      author: "",
      case_id: caseId,
      created_at: 1_721_000_100,
      evidence_url: "",
      id: index.toString(16).padStart(32, "0"),
      occurred_on: today,
      reason: "",
      session_id: `session-${index}`,
      title: `候補 ${index}`,
      updated_at: 1_721_000_100,
      verdict: "new" as const,
    }));
    const full = makeBindings({ suggestions });
    expect((await submitSuggestion(full.bindings)).status).toBe(429);
  });

  it("所有者だけが候補を正解にし、取り消すと捜索中へ戻せる", async () => {
    const owner = makeBindings();
    const denied = await app.request(
      `/api/cases/${caseId}/suggestions/${suggestionId}`,
      {
        body: JSON.stringify({ verdict: "correct" }),
        headers: {
          ...headers,
          authorization: `Bearer ${"9".repeat(64)}`,
        },
        method: "PATCH",
      },
      owner.bindings,
    );
    expect(denied.status).toBe(403);

    const solved = await app.request(
      `/api/cases/${caseId}/suggestions/${suggestionId}`,
      {
        body: JSON.stringify({ verdict: "correct" }),
        headers: { ...headers, authorization: `Bearer ${ownerToken}` },
        method: "PATCH",
      },
      owner.bindings,
    );
    expect(solved.status).toBe(200);
    expect((await solved.json<{ status: string }>()).status).toBe("solved");

    const reopened = await app.request(
      `/api/cases/${caseId}/suggestions/${suggestionId}`,
      {
        body: JSON.stringify({ verdict: "not_it" }),
        headers: { ...headers, authorization: `Bearer ${ownerToken}` },
        method: "PATCH",
      },
      owner.bindings,
    );
    expect((await reopened.json<{ status: string }>()).status).toBe("open");
  });

  it("所有者だけが全候補を読み、札を削除できる", async () => {
    const state = defaultState();
    state.suggestions[0]!.verdict = "hidden";
    const owner = makeBindings(state);
    const response = await app.request(
      `/api/cases/${caseId}/manage`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
      owner.bindings,
    );
    const body = await response.json<{ suggestions: unknown[] }>();
    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain(responderSessionId);

    const deleted = await app.request(
      `/api/cases/${caseId}`,
      {
        headers: { ...headers, authorization: `Bearer ${ownerToken}` },
        method: "DELETE",
      },
      owner.bindings,
    );
    expect(deleted.status).toBe(204);
    expect(owner.state.foundCase).toBeNull();
  });

  it("三つの独立報告で共有札を隠す", async () => {
    const state = defaultState();
    state.reportSessions = new Set(["first", "second"]);
    const { bindings, state: stored } = makeBindings(state);
    const response = await app.request(
      `/api/cases/${caseId}/report`,
      {
        body: JSON.stringify({ reason: "unsafe", sessionId }),
        headers,
        method: "POST",
      },
      bindings,
    );
    expect(response.status).toBe(200);
    expect(stored.foundCase?.status).toBe("hidden");
  });

  it("自動QAを操作イベントへ記録せず、通常イベントを45日で削除する", async () => {
    const qa = makeBindings();
    const qaResponse = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: caseId, name: "owner_opened", sessionId }),
        headers: { ...headers, "x-automated-qa": "1" },
        method: "POST",
      },
      qa.bindings,
    );
    expect(qaResponse.status).toBe(204);
    expect(qa.calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO product_events"))).toBe(
      false,
    );

    const regular = makeBindings();
    const response = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: caseId, name: "owner_opened", sessionId }),
        headers,
        method: "POST",
      },
      regular.bindings,
    );
    expect(response.status).toBe(204);
    expect(
      regular.calls.some(
        (call) =>
          call.sql.includes("DELETE FROM product_events") && call.sql.includes("45 * 86400"),
      ),
    ).toBe(true);
  });

  it("ヘルスと未定義APIをJSONで返す", async () => {
    const { bindings } = makeBindings();
    const health = await app.request("/healthz", undefined, bindings);
    expect(await health.json()).toMatchObject({ healthy: true, service: "ano-hon-fuda" });
    const missing = await app.request("/api/missing", undefined, bindings);
    const body = await missing.json<{ error: string; requestId: string }>();
    expect(missing.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.requestId).toBeTruthy();
  });
});
