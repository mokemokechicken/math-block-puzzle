# アプリ基盤 要件

## 対象 issue

- #1 アプリ基盤: GitHub Pages 用の静的 Web アプリを用意する

## 目的

GitHub Pages で配布できる最小の静的 Web アプリ基盤を作る。

## 要件

- `index.html` をルートに置き、GitHub Pages の root 配信で表示できる。
- `src/` に JavaScript と CSS を置く。
- `assets/` の基本ディレクトリを用意する。
- 初期表示として、タイトル、状態表示領域、盤面プレビュー領域を表示する。
- `npm run lint`、`npm run build`、`npm test` で検証できる。
- 現時点ではゲームロジックを入れず、後続 issue の受け皿にする。

## 非スコープ

- 盤面生成。
- 正解判定。
- ドラッグ入力。
- 成功演出。
- ヒント。

## 完了条件

- ローカルで `index.html` を開くと初期画面が表示される。
- `file://` の直開きでも初期描画が動く。
- 検証コマンドがすべて成功する。
- README と AGENTS.md に基本方針と検証コマンドが記載されている。
