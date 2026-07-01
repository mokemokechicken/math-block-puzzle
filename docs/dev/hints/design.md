# 段階ヒント 設計

## 方針

ヒントは、正解判定や盤面生成のルールを増やさず、現在盤面の `allAnswers` を利用する UI 支援として実装する。

`src/hints.js` は「どの段階でどのセル ID を示すか」を決める純粋ロジックを持つ。DOM class の付与、timer、reset は `src/main.js` 側で扱う。

## 段階

1. `source`: 正解候補の最初のブロックを示す。
2. `answer`: 正解候補の最後のブロックを答えとして示す。
3. `line`: 正解候補の 3 ブロック全体を示す。
4. `expression`: line を維持し、プレビュー欄に式を表示する。

「最後が答え方式」なので、正解候補の `cells[cells.length - 1]` を答えブロックとして扱う。右から左、下から上の候補でも、`scanBoardForAnswers()` が返す順序をそのまま使う。

## 候補選択

初期実装では `allAnswers[0]` をヒント対象にする。

盤面生成が最低保証正解数を満たすため、通常は候補が存在する。候補が空の場合はヒントを開始しない。

## Timer と reset

`createHintController()` は段階ごとの delay で timer を予約する。

reset 時は以下を行う。

1. 既存 timer を解除する。
2. hint token を進める。
3. 既存の hint class を消す。
4. まだ破棄されていなければ、新しい timer を予約する。

`clearTimeout()` だけでは queue 済み callback を止められないため、callback は予約時 token と現在 token を比較する。古い token の callback は何もせず終了する。

正解時は `stop()` で hint を止め、盤面更新後の `renderInitialScreen()` で新しい controller を作る。

## 表示 class

- `is-hint-source`: 第 1 段階の最初のブロック。
- `is-hint-answer`: 第 2 段階の答えブロック。
- `is-hint-line`: 第 3、4 段階の正解ライン。

選択中の `is-selected`、正解時の `is-correct`、消去時の `is-clearing` とは別 class にする。

## テスト

- `src/hints.js` の段階別セル選択と式表示を単体テストする。
- `createHintController()` の段階進行、reset、古い callback 無効化を fake timer でテストする。
