# Decisions

## 2026-07-30 — One memory card, no public board

- Decision: 公開質問掲示板を作らず、一冊を探す記憶の断片を一枚の共有札へ整理する
- Reason: 一覧への公開をためらう記憶でも、信頼する相手へ必要な手がかりを渡せる
- Boundary: 公開一覧、検索可能な相談アーカイブ、プロフィール、回答者名を扱わない

## 2026-07-30 — Human candidates, not generated guesses

- Decision: 候補は共有相手が書名、任意の著者、確認URL、短い理由として届ける
- Decision: サービス自身はAIで候補書名や根拠を生成しない
- Reason: 曖昧な記憶にもっともらしい架空書名を混ぜず、人が確認できる根拠へつなぐ

## 2026-07-30 — Capability URL, no Better Auth

- Decision: Better Authを導入せず、捜索札ごとの管理鍵を発行する
- Reason: 単発の捜索に登録を要求せず、メールとアカウント復旧情報を保有しない
- Boundary: 管理鍵はhash化して保存し、URL fragmentからBearer tokenへ渡す

## 2026-07-30 — Text clues only

- Decision: 画像アップロードを持たず、時期、場所、装丁、場面を自分の言葉で入力する
- Reason: 著作物の複製、個人情報が写った画像、画像保管と削除の運用を避ける
- Boundary: 長い本文引用、連絡先、手がかり欄の外部リンクを許可しない

## 2026-07-30 — Canonical delivery and limited retention

- Decision: 正規URLを`https://ano-hon-fuda.yhay81.com`とし、`workers.dev`とpreview URLを無効にする
- Decision: 捜索札と候補を180日以内、匿名操作イベントを45日以内に削除する
- Reason: 運用責任、共有先、不要な履歴を小さく保つ
