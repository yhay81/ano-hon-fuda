# Stack

- Runtime: Cloudflare Workers
- API / rendering: Hono / Hono JSX
- Build and quality: Vite+ / TypeScript / Oxlint / Oxfmt / Vitest
- Persistence: Cloudflare D1
- Delivery: `ano-hon-fuda.yhay81.com` custom domain; `workers.dev` and preview URLs disabled
- Authentication: Better Authなし。捜索札単位のowner capability key

アカウント、メール、Cookieを不要にできる単発共有の境界なので、Better Authは導入しません。複数の捜索を長期管理する利用者アカウントや請求が必要になった場合に再評価します。
