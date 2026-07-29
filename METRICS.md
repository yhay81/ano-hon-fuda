# Metrics

捜索札と候補の業務行を正本にし、訪問、URLコピー、管理画面表示、別日再訪だけを匿名イベントで補います。自動QAは`?qa=1`、WebDriver、`x-automated-qa`で除外します。

| Metric                    | Source                      | Meaning                           |
| ------------------------- | --------------------------- | --------------------------------- |
| `users`                   | distinct `visited` session  | 匿名訪問者                        |
| `seekers`                 | distinct case creator       | 捜索札を作った匿名利用者          |
| `cases_created`           | visible `cases`             | 作成された実捜索札                |
| `links_copied`            | distinct case context       | 共有URLまたは共有文をコピーした札 |
| `owner_opened`            | distinct case context       | 管理画面が開かれた札              |
| `suggestions`             | visible `suggestions`       | 現在保存されている候補            |
| `responders`              | distinct suggestion session | 候補を届けた匿名回答者            |
| `cases_with_suggestions`  | suggestion aggregation      | 1件以上候補が届いた札             |
| `cases_with_3_responders` | suggestion aggregation      | 3回答者以上から候補が届いた札     |
| `solved_cases`            | solved `cases`              | 「これです」まで進んだ札          |
| `repeat_seekers`          | creator aggregation         | 2札以上作った匿名利用者           |
| `returned`                | distinct `returned` session | 別日に再訪した匿名利用者          |

記憶の内容、候補書名、著者、確認URL、判定、IPアドレス、User-Agentは操作イベントへ記録しません。ブラウザ生成UUID、操作名、捜索札IDまたは`home`、発生日だけを45日以内保存します。
