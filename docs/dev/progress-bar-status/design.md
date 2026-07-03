# 進捗バー表示 設計

## 方針

既存の `createGamePanelMarkup()` が描画している `game-toolbar` 内のカウンターを、正解候補数カウンターから Progress バー表示へ置き換える。

ゲーム進行の状態は既存の `correctCount` と `level.clearAnswerCount` で足りるため、新しい状態フィールドは追加しない。

## UI

- `game-toolbar` の右側に `progress-meter` を表示する。
- `progress-meter` は以下で構成する。
  - `progress-meter__label`: `進捗`
  - `progress-meter__value`: `0 / 5`
  - `progress-meter__track`: 横長の背景
  - `progress-meter__fill`: 進捗率に応じて横幅を変える塗り
- `progress-meter` には `role="progressbar"`、`aria-valuemin`、`aria-valuemax`、`aria-valuenow` を付与する。
- 進捗率は `correctCount / clearAnswerCount` を 0..100% に丸めて CSS custom property `--progress-percent` に渡す。

## 実装対象

- `src/main.js`
  - `createProgressMarkup(state)` を追加する。
  - `createGamePanelMarkup(state)` から `answer-count` を削除し、Progress バーに置換する。
- `src/styles.css`
  - `progress-meter` 系のスタイルを追加する。
  - 未使用になる `answer-count` スタイルを削除する。
- `test/board-ui.test.js`
  - 正解候補数 UI が出ないことを検証する。
  - Progress バーの ARIA 属性と進捗率を検証する。
- `knowledge/docs/design/current-implementation.md`
  - UI 説明から正解候補数表示を外し、Progress バーを記載する。
- `knowledge/rules/manual-qa-checklist.md`
  - QA 項目を Progress バー基準に更新する。

## リスクと対策

- 進捗率の丸めにより視覚表示が 100% を超える可能性がある。
  - `currentCount` を `0..targetCount` に制限してから `--progress-percent` を計算する。
- スマホ幅でツールバー内の表示が詰まる可能性がある。
  - 既存の `@media (max-width: 520px)` ではツールバーが縦積みになるため、Progress バーは幅いっぱいに伸ばす。
