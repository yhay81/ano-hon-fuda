# あの本札 public pilot

## Decision

- Status: 30-day public pilot
- Review deadline: 2026-08-29
- Investment decision: hold
- Target: 題名を思い出せない本があり、読書仲間や家族、司書などへ手がかりを共有できる人
- Existing alternatives: Yahoo!知恵袋、掲示板、読書SNS、図書館レファレンス、検索エンジン

公開掲示板を再現せず、「記憶を構造化した非公開共有札」と「候補の確認棚」だけで、実際に本の発見まで進むかを確かめます。

## Falsifiable outcome

- Continue: 実相談者5人以上、候補が届いた札3件以上、実回答者10人以上、候補15件以上、解決2件以上
- Hold: 30日後も候補が届いた札2件未満、または解決0件
- Stop/reshape: 公開一覧、画像投稿、通知、AI候補生成がなければ回答者へ届かない
- Automated QA、自己テスト、訪問だけのセッションは実利用に数えない

獲得は検索、Tool Shelf、利用者自身による自然な共有に限定します。許可のないDM、メール、SNS投稿は行いません。

## Safety boundary

- 相談者名、回答者名、メール、画像を入力させない
- 共有札は推測困難なURLでのみ開き、公開一覧やsitemapへ載せない
- 公開APIは回答者の匿名ブラウザID、管理鍵、個別操作履歴を返さない
- 管理鍵はhash化し、URL fragmentからBearer tokenへ渡す
- 外部URLは取得せず、候補の確認先として一般公開されたHTTPS URLだけを受け付ける
- 1端末1日1候補を書き直し可能、1札200候補、1端末1日5札
- 3つの異なる匿名セッションから報告された共有札を非表示にする
