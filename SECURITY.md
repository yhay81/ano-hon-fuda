# Security

## Controls

- 128-bit case IDと256-bit owner capability key
- D1には管理鍵のSHA-256 hashだけを保存し、定時間比較
- same-origin write、JSON content type、body size、文字数、列挙値を検証
- 確認先は公開HTTPS URLだけを許可し、資格情報、任意port、localhost、ローカル用TLD、IPリテラルを拒否
- 記憶・書名・著者・理由のURL、メールアドレス、制御文字、honeypot入力を拒否
- 1匿名ブラウザ1日1候補を書き直し可能、1捜索札200候補
- 1匿名ブラウザ1日5札作成
- 3つの異なる匿名セッションから報告された共有札を自動非表示
- private routeの`noindex` / `no-store`、CSP、HSTS、nosniff、frame deny
- JSXとDOM `textContent`だけで利用者入力を表示
- scheduled cleanupで捜索札と候補を180日以内、匿名操作イベントを45日以内に削除

## Capability boundary

公開APIは記憶の手がかりと非表示以外の候補だけを返し、相談者・回答者の匿名ブラウザID、管理鍵、個別操作履歴を返しません。全候補の確認、判定、削除は管理APIだけが扱います。管理APIはURL fragmentから読み出した管理鍵をBearer tokenとして受け取ります。

管理URLを失うと復旧できません。共有札URLと分けて安全な場所へ保管してください。

## Reporting

秘密鍵の漏えいや脆弱性は公開issueへ本文を貼らず、GitHub Security Advisoryのprivate reportを利用してください。
