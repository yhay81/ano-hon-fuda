# Privacy

## Product data

D1へ本の種類、読んだ時期と場所、装丁と内容の記憶、すでに探した場所、候補書名、任意の著者・確認URL・理由・判定、匿名ブラウザID、日付を保存します。共有札は推測困難な128-bit IDで共有し、公開一覧やsitemapへ載せません。

氏名、メールアドレス、画像、IPアドレス、User-Agentは製品データとして保存しません。捜索札と候補は作成から180日以内に削除し、相談者は管理URLから即時削除できます。外部URLの内容は取得しません。

## Visibility and capability key

共有札へ記憶の手がかりと、非表示以外の候補・判定を表示します。非表示候補の確認、判定変更、削除は256-bit管理鍵を持つ相談者だけが実行できます。D1には管理鍵のSHA-256 hashだけを保存します。

管理鍵はURL fragmentに含めるため、通常のHTTPリクエスト、Referer、アクセスログへ送られません。ブラウザは管理APIへBearer tokenとして渡し、作成端末のlocalStorageにも保存します。管理URLを失うと復旧できません。

## Anonymous telemetry

Cookieは使いません。ブラウザのlocalStorageにランダムUUIDを作り、訪問、札作成、URLコピー、候補保存、管理画面表示、解決、削除、別日再訪の操作名と発生日を45日以内保存します。記憶の内容、候補の内容、判定、IPアドレス、User-Agentは操作イベントへ含めません。`?qa=1`、WebDriver、`x-automated-qa`による自動QAは記録しません。
