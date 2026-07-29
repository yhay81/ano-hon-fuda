# あの本札

題名を思い出せない本の記憶を一枚の捜索札へ整理し、URLを知る人から候補書名と確認の手がかりを受け取る日本語Webサービスです。

- サービス: <https://ano-hon-fuda.yhay81.com>
- 使い方: <https://ano-hon-fuda.yhay81.com/guide>
- プライバシー: <https://ano-hon-fuda.yhay81.com/privacy>

## Product boundary

探している人は、読んだ時期、場所、装丁、覚えている場面を入力し、共有URLと管理URLを受け取ります。共有相手は候補の書名、任意の著者、確認できる公開HTTPS URL、短い理由を一日一回書き直せます。管理URLを持つ人だけが候補を「確認中」「違った」「これです」「隠す」に分類できます。

相談者名、回答者名、メール、画像、公開一覧、AIによる書名生成、通知は扱いません。捜索札と候補は180日以内、匿名操作イベントは45日以内に削除します。

## Development

Node.js 24 LTSとnpmを使います。

```powershell
npm ci
npx wrangler d1 migrations apply ano-hon-fuda --local
npm run dev -- --host 127.0.0.1 --port 5176
```

検査:

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit --omit=dev
```

本番:

```powershell
npx wrangler d1 migrations apply ano-hon-fuda --remote
npm run deploy
npm run indexnow
npm run metrics
```

## Stack

Cloudflare Workers / D1、Hono / Hono JSX、Vite+、TypeScript。Better Authは使わず、捜索札ごとの256-bit owner capability keyで管理権限を分離します。
