import { apiJson, sessionId, setStatus, trackVisit } from "./common.js";

const app = document.querySelector("#case-app");
const caseId = app?.dataset.caseId ?? "";
const form = document.querySelector("#suggestion-form");
const button = document.querySelector("#suggestion-button");
const status = document.querySelector("#suggestion-status");
let model = null;

const kindLabels = {
  manga: "漫画",
  novel: "小説・読みもの",
  other: "その他・不明",
  picture: "絵本・児童書",
  reference: "図鑑・実用書",
};

const verdictLabels = {
  checking: "確認中",
  correct: "これです",
  new: "新しい候補",
  not_it: "違いました",
};

const setText = (selector, value) => {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value || "—");
};

const appendText = (parent, tag, text, className = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
};

const renderCase = (value) => {
  setText("#case-title", value.memoryTitle);
  setText("#case-meta", `${kindLabels[value.kind] ?? "本"} · ${value.readWhen}`);
  setText("#clue-when", value.readWhen);
  setText("#clue-where", value.readWhere);
  setText("#clue-cover", value.coverHint);
  setText("#clue-memory", value.memoryText);
  setText("#clue-tried", value.alreadyTried);
  const badge = document.querySelector("#case-status-badge");
  if (badge) {
    badge.textContent = value.status === "solved" ? "見つかりました" : "捜索中";
    badge.dataset.solved = value.status === "solved" ? "true" : "false";
  }
  if (form instanceof HTMLFormElement && button instanceof HTMLButtonElement) {
    const solved = value.status === "solved";
    form.hidden = solved;
    button.disabled = solved;
  }
};

const renderSuggestions = (suggestions) => {
  const list = document.querySelector("#suggestion-list");
  if (!(list instanceof HTMLElement)) return;
  list.replaceChildren();
  setText("#suggestion-count", suggestions.length);
  if (suggestions.length === 0) {
    appendText(list, "p", "候補はまだありません。思い当たる一冊を置いてください。", "empty-shelf");
    return;
  }
  suggestions.forEach((suggestion) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    card.dataset.verdict = suggestion.verdict;
    const header = document.createElement("header");
    const titleWrap = document.createElement("div");
    appendText(titleWrap, "h3", suggestion.title);
    if (suggestion.author) appendText(titleWrap, "span", suggestion.author);
    header.append(titleWrap);
    appendText(header, "span", verdictLabels[suggestion.verdict] ?? "候補", "verdict");
    card.append(header);
    if (suggestion.reason) appendText(card, "p", suggestion.reason);
    if (suggestion.evidenceUrl) {
      const link = appendText(card, "a", "確認先を開く ↗");
      link.href = suggestion.evidenceUrl;
      link.rel = "nofollow noopener noreferrer";
      link.target = "_blank";
    }
    list.append(card);
  });
};

const load = async () => {
  try {
    model = await apiJson(`/api/cases/${caseId}`);
    renderCase(model);
    renderSuggestions(model.suggestions);
  } catch {
    setStatus(status, "この捜索札は利用できません。", "error");
    if (button instanceof HTMLButtonElement) button.disabled = true;
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !(form instanceof HTMLFormElement) ||
    !(button instanceof HTMLButtonElement) ||
    !form.reportValidity()
  ) {
    return;
  }
  button.disabled = true;
  setStatus(status, "候補の本を棚へ置いています…");
  try {
    const result = await apiJson(`/api/cases/${caseId}/suggestions`, {
      body: JSON.stringify({
        author: document.querySelector("#suggestion-author")?.value ?? "",
        evidenceUrl: document.querySelector("#evidence-url")?.value ?? "",
        reason: document.querySelector("#suggestion-reason")?.value ?? "",
        sessionId,
        title: document.querySelector("#suggestion-title")?.value ?? "",
        website: document.querySelector("#suggestion-website")?.value ?? "",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    renderSuggestions(result.suggestions);
    form.reset();
    setStatus(status, "候補を届けました。同じ日の候補は書き直せます。", "success");
  } catch (error) {
    const messages = {
      case_full: "この捜索札は候補の受付上限に達しました。",
      invalid_suggestion: "書名と、任意の著者・確認URL・手がかりを見直してください。",
    };
    setStatus(
      status,
      messages[error.message] ?? "候補を届けられませんでした。もう一度お試しください。",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#report-button")?.addEventListener("click", async () => {
  if (!confirm("スパムや危険な内容として、この捜索札を報告しますか？")) return;
  try {
    await apiJson(`/api/cases/${caseId}/report`, {
      body: JSON.stringify({ reason: "unsafe", sessionId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setStatus(status, "報告を受け付けました。", "success");
  } catch {
    setStatus(status, "報告を送れませんでした。", "error");
  }
});

void load();
trackVisit(caseId);
