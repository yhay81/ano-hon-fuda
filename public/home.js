import {
  apiJson,
  isAutomatedQa,
  linkFor,
  rememberOwner,
  sessionId,
  setStatus,
  trackVisit,
} from "./common.js";

const form = document.querySelector("#create-form");
const button = document.querySelector("#create-button");
const status = document.querySelector("#create-status");

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
  setStatus(status, "記憶の断片を一枚へ並べています…");
  try {
    const result = await apiJson("/api/cases", {
      body: JSON.stringify({
        alreadyTried: document.querySelector("#already-tried")?.value ?? "",
        coverHint: document.querySelector("#cover-hint")?.value ?? "",
        kind: document.querySelector("#kind")?.value ?? "",
        memoryText: document.querySelector("#memory-text")?.value ?? "",
        memoryTitle: document.querySelector("#memory-title")?.value ?? "",
        ownership: document.querySelector("#ownership")?.checked === true,
        readWhen: document.querySelector("#read-when")?.value ?? "",
        readWhere: document.querySelector("#read-where")?.value ?? "",
        sessionId,
        website: document.querySelector("#website")?.value ?? "",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    rememberOwner(result.caseId, result.ownerToken);
    setStatus(status, "捜索札を作成しました。管理画面へ移動します。", "success");
    location.assign(linkFor(`/manage/${result.caseId}`, result.ownerToken));
  } catch (error) {
    const messages = {
      blocked_text: "URL、メールアドレス、長すぎる引用を手がかり欄から外してください。",
      invalid_case: "見出し、種類、読んだ時期、20文字以上の記憶、確認欄を見直してください。",
      rate_limited: "今日は5件作成しています。明日もう一度お試しください。",
    };
    setStatus(
      status,
      messages[error.message] ?? "作成できませんでした。もう一度お試しください。",
      "error",
    );
    button.disabled = false;
  }
});

if (isAutomatedQa) document.documentElement.dataset.qa = "true";
trackVisit("home");
