# 盤面 UI 設計

## 構成

`src/main.js` を、初期画面だけの描画から小さな app controller に拡張する。

```text
MathBlockPuzzleApp
├── createGameState()
├── formatSelectionPreview()
├── createBoardMarkup()
├── createCellMap()
├── markSelectedCells()
├── setupBoardInput()
└── renderInitialScreen()
```

## 依存

- `MathBlockPuzzleConfig`: レベル設定。
- `MathBlockPuzzleBoard`: 盤面生成。
- `MathBlockPuzzleRules`: 式判定と式表示。
- `MathBlockPuzzleInput`: Pointer Events 入力。

## 表示

`renderInitialScreen()` は LV2 の `5 x 5` 盤面を生成して表示する。

各セルは button とし、次の data 属性を持つ。

- `data-cell-id`
- `data-row`
- `data-col`
- `data-value`

入力 controller は `data-cell-id` からセル情報へ戻す。

## 式プレビュー

- 0 個: `ブロックをなぞって式を作ろう`
- 1 個: 選択値だけ表示
- 2 個: `a ± b = ?`
- 3 個で成立: `a + b = c` または `a - b = c`
- 3 個で不成立: `a ? b = c`

## ライフサイクル

再描画前に既存 controller を `destroy()` する。

#5 の残課題だった controller の寿命管理を、ここで最小限扱う。
