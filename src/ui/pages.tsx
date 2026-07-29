import { product } from "../config/product";
import { Layout } from "./layout";

const kindOptions = [
  ["novel", "小説・読みもの"],
  ["picture", "絵本・児童書"],
  ["manga", "漫画"],
  ["reference", "図鑑・実用書"],
  ["other", "その他・不明"],
] as const;

function MemorySlips() {
  return (
    <div aria-hidden="true" class="memory-slips">
      <article class="memory-slip slip-when">
        <small>WHEN</small>
        <strong>小学生のころ</strong>
        <span>2000年代前半</span>
      </article>
      <article class="memory-slip slip-where">
        <small>WHERE</small>
        <strong>学校の図書室</strong>
        <span>少し大きな本</span>
      </article>
      <article class="memory-slip slip-cover">
        <small>COVER</small>
        <strong>青い夜の表紙</strong>
        <span>銀色の線があった</span>
      </article>
      <article class="memory-slip slip-scene">
        <small>SCENE</small>
        <strong>月を運ぶ小さな船</strong>
        <span>最後に朝が来る</span>
      </article>
    </div>
  );
}

function SearchLens() {
  return (
    <div aria-hidden="true" class="search-lens">
      <i></i>
      <b>?</b>
      <em></em>
    </div>
  );
}

function CandidateShelf({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden="true" class={compact ? "candidate-shelf compact" : "candidate-shelf"}>
      <small>CANDIDATES</small>
      <div class="book-row">
        <article class="book book-a">
          <i></i>
          <strong>月の舟</strong>
          <span>確認中</span>
        </article>
        <article class="book book-b">
          <i></i>
          <strong>夜を渡る</strong>
          <span>候補</span>
        </article>
        <article class="book book-c">
          <i></i>
          <strong>星の港</strong>
          <span>ちがった</span>
        </article>
      </div>
      <p>
        <span>✓</span>
        書名と根拠を受け取る
      </p>
    </div>
  );
}

export function HomePage() {
  return (
    <Layout>
      <section class="clue-stage" aria-label="本の記憶の断片が候補書名へつながるイメージ">
        <div class="stage-caption left">
          <small>MEMORY</small>
          <strong>覚えていること</strong>
        </div>
        <MemorySlips />
        <SearchLens />
        <CandidateShelf />
        <div class="stage-caption right">
          <small>ONE CARD</small>
          <strong>候補の本棚</strong>
        </div>
      </section>

      <section class="maker-shell" id="make">
        <div class="maker-intro">
          <span class="eyebrow">CLUES INTO ONE CARD</span>
          <h1>{product.headline}</h1>
          <p>
            読んだ時期、場所、表紙、覚えている場面を一枚へ。URLを知る人から、候補書名と確認の手がかりを受け取れます。
          </p>
          <ol>
            <li>
              <span>01</span>記憶の断片を札にする
            </li>
            <li>
              <span>02</span>本に詳しい人へ共有
            </li>
            <li>
              <span>03</span>候補を確かめて正解に
            </li>
          </ol>
        </div>

        <form class="maker" id="create-form">
          <header>
            <span aria-hidden="true" class="clue-icon">
              <i></i>
              <b></b>
              <em></em>
            </span>
            <div>
              <span class="eyebrow">NEW SEARCH CARD</span>
              <h2>あの本の捜索札をつくる</h2>
            </div>
          </header>
          <label class="field">
            <span>手がかりの見出し</span>
            <input
              id="memory-title"
              maxlength={80}
              placeholder="学校の図書室で読んだ青い本"
              required
            />
          </label>
          <div class="field-grid">
            <label class="field">
              <span>本の種類</span>
              <select id="kind" required>
                {kindOptions.map(([value, label]) => (
                  <option value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>いつ読んだ？</span>
              <input
                id="read-when"
                maxlength={80}
                placeholder="2000年代前半、小学生のころ"
                required
              />
            </label>
          </div>
          <label class="field">
            <span>
              どこで・どんな形で？ <small>任意</small>
            </span>
            <input id="read-where" maxlength={80} placeholder="学校の図書室、単行本、少し大きめ" />
          </label>
          <label class="field">
            <span>
              表紙や装丁の記憶 <small>任意</small>
            </span>
            <textarea
              id="cover-hint"
              maxlength={200}
              placeholder="青い夜空。銀色の細い線で船が描かれていた気がします。"
              rows={3}
            ></textarea>
          </label>
          <label class="field">
            <span>覚えている場面・ことば・登場人物</span>
            <textarea
              id="memory-text"
              maxlength={1000}
              minlength={20}
              placeholder="主人公が月を小さな船に載せて運びます。最後に朝が来て、港のような場所へ戻る場面がありました。"
              required
              rows={6}
            ></textarea>
          </label>
          <label class="field">
            <span>
              すでに探した場所 <small>任意</small>
            </span>
            <textarea
              id="already-tried"
              maxlength={240}
              placeholder="図書館で「月 船 児童書」を検索しました。"
              rows={2}
            ></textarea>
          </label>
          <p class="form-note">
            本文の長い引用、表紙画像、氏名・学校名などの個人情報は入れないでください。
          </p>
          <label class="ownership-check">
            <input id="ownership" required type="checkbox" />
            <span>自分の記憶を整理し、共有する札です</span>
          </label>
          <label aria-hidden="true" class="honeypot">
            Website
            <input id="website" tabindex={-1} />
          </label>
          <button class="button primary" id="create-button" type="submit">
            捜索札をつくる <span aria-hidden="true">→</span>
          </button>
          <p class="action-status" id="create-status" aria-live="polite"></p>
        </form>
      </section>
      <section class="boundary-strip" aria-label="サービスの範囲">
        <span>公開一覧なし</span>
        <span>画像アップロードなし</span>
        <span>回答者名なし</span>
      </section>
      <script src="/home.js?v=1" type="module"></script>
    </Layout>
  );
}

function ClueBoard() {
  return (
    <section class="clue-board">
      <article>
        <small>WHEN</small>
        <strong id="clue-when">読み込んでいます</strong>
      </article>
      <article>
        <small>WHERE / FORMAT</small>
        <strong id="clue-where">—</strong>
      </article>
      <article>
        <small>COVER</small>
        <p id="clue-cover">—</p>
      </article>
      <article class="wide">
        <small>SCENE / WORDS / PEOPLE</small>
        <p id="clue-memory">—</p>
      </article>
      <article class="wide muted">
        <small>ALREADY TRIED</small>
        <p id="clue-tried">—</p>
      </article>
    </section>
  );
}

export function CasePage({ caseId, memoryTitle }: { caseId: string; memoryTitle: string }) {
  return (
    <Layout
      bodyClass="private-page"
      canonical={`${product.url}/c/${caseId}`}
      noindex
      title={`${memoryTitle} | ${product.name}`}
    >
      <section class="case-shell" data-case-id={caseId} id="case-app">
        <header class="case-heading">
          <div>
            <span class="eyebrow">BOOK SEARCH CARD</span>
            <h1 id="case-title">{memoryTitle}</h1>
            <p id="case-meta">記憶の札を読み込んでいます</p>
          </div>
          <span class="status-badge" id="case-status-badge">
            捜索中
          </span>
        </header>
        <div class="case-workspace">
          <ClueBoard />
          <section class="suggestion-panel">
            <header>
              <div>
                <span class="eyebrow">CANDIDATE SHELF</span>
                <h2>思い当たる本はありますか？</h2>
              </div>
              <strong id="suggestion-count">0</strong>
            </header>
            <div class="suggestion-list" id="suggestion-list"></div>
            <form class="suggestion-form" id="suggestion-form">
              <label class="field">
                <span>候補の書名</span>
                <input id="suggestion-title" maxlength={120} required />
              </label>
              <label class="field">
                <span>
                  著者・作者 <small>任意</small>
                </span>
                <input id="suggestion-author" maxlength={80} />
              </label>
              <label class="field">
                <span>
                  確認できるURL <small>任意</small>
                </span>
                <input
                  id="evidence-url"
                  inputmode="url"
                  maxlength={500}
                  placeholder="https://..."
                />
              </label>
              <label class="field">
                <span>
                  そう思った手がかり <small>任意</small>
                </span>
                <textarea id="suggestion-reason" maxlength={300} rows={3}></textarea>
              </label>
              <label aria-hidden="true" class="honeypot">
                Website
                <input id="suggestion-website" tabindex={-1} />
              </label>
              <button class="button accent" id="suggestion-button" type="submit">
                候補を一冊置く
              </button>
              <p class="action-status" id="suggestion-status" aria-live="polite"></p>
            </form>
          </section>
        </div>
        <button class="report-link" id="report-button" type="button">
          この捜索札を報告
        </button>
      </section>
      <script src="/case.js?v=1" type="module"></script>
    </Layout>
  );
}

export function ManagePage({ caseId }: { caseId: string }) {
  return (
    <Layout
      bodyClass="private-page"
      canonical={`${product.url}/manage/${caseId}`}
      noindex
      title={`捜索札の管理 | ${product.name}`}
    >
      <section class="manage-shell" data-case-id={caseId} id="manage-app">
        <header class="manage-heading">
          <div>
            <span class="eyebrow">PRIVATE DESK</span>
            <h1 id="manage-title">捜索札を読み込んでいます</h1>
            <p id="manage-meta"></p>
          </div>
          <a class="button compact" href="#" id="public-link">
            共有札を見る
          </a>
        </header>
        <div class="manage-grid">
          <section class="manage-clues">
            <span class="eyebrow">MEMORY CLUES</span>
            <ClueBoard />
          </section>
          <section class="manage-candidates">
            <header>
              <div>
                <span class="eyebrow">CANDIDATES</span>
                <h2>候補を確かめる</h2>
              </div>
              <strong id="manage-count">0</strong>
            </header>
            <div class="manage-suggestions" id="manage-suggestions"></div>
          </section>
          <section class="install-card">
            <span class="eyebrow">SHARE THIS CARD</span>
            <h2>本に詳しい人へ渡す</h2>
            <label>
              共有URL
              <textarea id="link-code" readonly rows={3}></textarea>
            </label>
            <div>
              <button class="button compact" id="copy-url" type="button">
                URLをコピー
              </button>
              <button class="button compact accent" id="copy-code" type="button">
                共有文をコピー
              </button>
            </div>
            <p class="action-status" id="manage-status" aria-live="polite"></p>
          </section>
        </div>
        <section class="danger-zone">
          <div>
            <strong>捜索札を削除</strong>
            <p>記憶の断片と届いた候補をすべて削除します。元に戻せません。</p>
          </div>
          <button class="button danger" id="delete-button" type="button">
            削除する
          </button>
        </section>
      </section>
      <script src="/manage.js?v=1" type="module"></script>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout canonical={`${product.url}/guide`} title={`使い方 | ${product.name}`}>
      <article class="guide-board">
        <header>
          <span class="eyebrow">HOW TO SEARCH</span>
          <h1>検索語になる前の記憶を、一枚へ。</h1>
          <p>
            題名が分からなくても、いつ、どこで、どんな表紙で、何が起きたかは手がかりになります。
          </p>
        </header>
        <ol class="guide-steps">
          <li>
            <span>01</span>
            <div>
              <strong>断片を分けて書く</strong>
              <p>
                読んだ時期、場所、装丁、場面を別々の欄へ。確信がない記憶は「たぶん」と書けます。
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>共有URLを渡す</strong>
              <p>読書仲間、家族、司書など、思い当たる人へ共有します。公開一覧には載りません。</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>候補を確認する</strong>
              <p>
                書名、著者、根拠URLを見比べ、「確認中」「違った」「これです」を管理画面で付けます。
              </p>
            </div>
          </li>
        </ol>
        <section class="guide-note">
          <strong>長い引用や個人情報は入れない</strong>
          <p>
            本文をそのまま長く書き写さず、記憶を自分の言葉で要約してください。氏名、学校名、連絡先も不要です。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout canonical={`${product.url}/privacy`} title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <header>
          <span class="eyebrow">PRIVACY</span>
          <h1>記憶の札だけを共有し、誰の記憶かは集めない。</h1>
        </header>
        <section>
          <h2>共有URLへ出るもの</h2>
          <p>
            手がかりの見出し、本の種類、読んだ時期と場所、装丁、覚えている内容、すでに探した場所、届いた候補と判定です。推測困難なURLを知る人だけが開け、公開一覧やsitemapには載せません。
          </p>
        </section>
        <section>
          <h2>保存しないもの</h2>
          <p>
            相談者名、回答者名、メールアドレス、画像、IPアドレス、User-Agentは製品データとして保存しません。外部URLの内容も取得しません。
          </p>
        </section>
        <section>
          <h2>保持期間</h2>
          <p>
            捜索札と候補は作成から180日以内、匿名の操作イベントは45日以内に削除します。相談者は管理URLから即時削除できます。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout noindex title={`見つかりません | ${product.name}`}>
      <section class="not-found">
        <SearchLens />
        <h1>この捜索札は見つかりません。</h1>
        <p>URLを確認するか、トップページから新しい捜索札をつくってください。</p>
        <a class="button compact" href="/">
          トップへ戻る
        </a>
      </section>
    </Layout>
  );
}
