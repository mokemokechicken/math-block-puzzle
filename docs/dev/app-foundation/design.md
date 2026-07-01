# アプリ基盤 設計

## 構成

初期実装はビルドなしで動く静的ファイル構成にする。

```text
index.html
src/main.js
src/styles.css
assets/.gitkeep
scripts/lint.js
scripts/build.js
test/app-foundation.test.js
```

## 方針

- `index.html` は GitHub Pages で直接配信される前提にする。
- JavaScript は classic script として読み込む。`file://` 直開きでも初期画面を表示できるようにするため。
- CSS は `src/styles.css` に集約する。
- `assets/` は画像や音などの将来アセット置き場として先に用意する。
- 後続のゲーム実装で差し替えやすいように、表示領域は `#game-root` にまとめる。
- 検証コマンドは依存パッケージなしで動く Node.js スクリプトにする。
- `#game-root` が存在しない場合は、空画面を静かに出すのではなく明示的に失敗させる。

## 関心事の分離

- HTML はアプリの読み込みと landmark のみを持つ。
- CSS はレイアウトと初期見た目だけを担当する。
- `src/main.js` は初期画面の描画だけを担当する。
- `src/main.js` は `globalThis.MathBlockPuzzleApp` に初期描画関数を公開し、Node.js の smoke test からも同じ関数を確認する。
- lint/build/test は `scripts/` と `test/` に分ける。
- smoke test では、`renderInitialScreen` が実際に mount point へ表示用 markup を入れることを確認する。

## 将来の拡張

- #2 でレベルや数字範囲の設定を `src/` に追加する。
- #3 以降で盤面生成と正解判定を純粋関数として追加する。
- #5 以降で DOM 入力処理を `#game-root` の内側へ接続する。
