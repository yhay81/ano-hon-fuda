import {
  apiJson,
  authorization,
  copyText,
  forgetCase,
  linkFor,
  readOwner,
  setStatus,
  track,
} from "./common.js";

const app = document.querySelector("#manage-app");
const caseId = app?.dataset.caseId ?? "";
const owner = readOwner(caseId);
const status = document.querySelector("#manage-status");
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

if (location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);

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

const renderClues = (value) => {
  setText("#manage-title", value.memoryTitle);
  setText(
    "#manage-meta",
    `${kindLabels[value.kind] ?? "本"} · ${value.status === "solved" ? "見つかりました" : "捜索中"}`,
  );
  setText("#clue-when", value.readWhen);
  setText("#clue-where", value.readWhere);
  setText("#clue-cover", value.coverHint);
  setText("#clue-memory", value.memoryText);
  setText("#clue-tried", value.alreadyTried);
};

const updateVerdict = async (suggestionId, verdict) => {
  try {
    model = await apiJson(`/api/cases/${caseId}/suggestions/${suggestionId}`, {
      body: JSON.stringify({ verdict }),
      headers: {
        ...authorization(owner),
        "content-type": "application/json",
      },
      method: "PATCH",
    });
    renderClues(model);
    renderSuggestions(model.suggestions);
    setStatus(
      status,
      verdict === "correct" ? "正解の本として記録しました。" : "候補の判定を更新しました。",
      "success",
    );
  } catch {
    setStatus(status, "候補を更新できませんでした。", "error");
  }
};

const renderSuggestions = (suggestions) => {
  const list = document.querySelector("#manage-suggestions");
  if (!(list instanceof HTMLElement)) return;
  list.replaceChildren();
  setText("#manage-count", suggestions.filter((item) => item.verdict !== "hidden").length);
  if (suggestions.length === 0) {
    appendText(
      list,
      "p",
      "候補はまだ届いていません。共有URLを本に詳しい人へ渡してください。",
      "empty-shelf",
    );
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
    appendText(header, "span", verdictLabels[suggestion.verdict] ?? "非表示", "verdict");
    card.append(header);
    if (suggestion.reason) appendText(card, "p", suggestion.reason);
    if (suggestion.evidenceUrl) {
      const link = appendText(card, "a", "確認先を開く ↗");
      link.href = suggestion.evidenceUrl;
      link.rel = "nofollow noopener noreferrer";
      link.target = "_blank";
    }
    const actions = document.createElement("div");
    actions.className = "manage-actions";
    [
      ["checking", "確認中"],
      ["not_it", "違った"],
      ["correct", "これです"],
      ["hidden", "隠す"],
    ].forEach(([verdict, label]) => {
      const control = appendText(actions, "button", label);
      control.type = "button";
      control.dataset.action = verdict;
      control.addEventListener("click", () => void updateVerdict(suggestion.id, verdict));
    });
    card.append(actions);
    list.append(card);
  });
};

const load = async () => {
  if (!owner) {
    setStatus(status, "この端末に管理鍵がありません。作成時の管理URLを開いてください。", "error");
    document.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
    });
    return;
  }
  try {
    model = await apiJson(`/api/cases/${caseId}/manage`, {
      headers: authorization(owner),
    });
    renderClues(model);
    renderSuggestions(model.suggestions);
    const publicUrl = linkFor(`/c/${caseId}`);
    const publicLink = document.querySelector("#public-link");
    if (publicLink instanceof HTMLAnchorElement) publicLink.href = publicUrl;
    const linkCode = document.querySelector("#link-code");
    if (linkCode instanceof HTMLTextAreaElement) {
      linkCode.value = `題名を思い出せない本を探しています。\n${model.memoryTitle}\n${publicUrl}`;
    }
    track("owner_opened", caseId);
  } catch {
    setStatus(status, "管理鍵が違うか、この捜索札は削除されています。", "error");
  }
};

document.querySelector("#copy-url")?.addEventListener("click", async () => {
  try {
    await copyText(linkFor(`/c/${caseId}`));
    setStatus(status, "共有URLをコピーしました。", "success");
    track("link_copied", caseId);
  } catch {
    setStatus(status, "コピーできませんでした。", "error");
  }
});

document.querySelector("#copy-code")?.addEventListener("click", async () => {
  const code = document.querySelector("#link-code")?.value ?? "";
  try {
    await copyText(code);
    setStatus(status, "共有文をコピーしました。", "success");
    track("link_copied", caseId);
  } catch {
    setStatus(status, "コピーできませんでした。", "error");
  }
});

document.querySelector("#delete-button")?.addEventListener("click", async () => {
  if (!owner || !confirm("この捜索札と候補をすべて削除しますか？元に戻せません。")) return;
  try {
    await apiJson(`/api/cases/${caseId}`, {
      headers: authorization(owner),
      method: "DELETE",
    });
    track("case_deleted", caseId);
    forgetCase(caseId);
    location.assign(linkFor("/"));
  } catch {
    setStatus(status, "削除できませんでした。", "error");
  }
});

void load();
