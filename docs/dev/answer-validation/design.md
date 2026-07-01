# 正解判定 設計

## 構成

`src/rules.js` に、プレイヤー選択の正解判定をまとめる。

```text
MathBlockPuzzleRules
├── formatExpression()
├── evaluateEquation()
├── getDirectionIdForStep()
└── validateSelection()
```

## 判定手順

`validateSelection(cells, level)` は次の順番で判定する。

1. 選択数がレベル設定の `selectionLength` と一致するか。
2. 各セルに `row`、`col`、`value` があるか。
3. 1 個目から 2 個目の差分が縦横 1 マスの方向か。
4. 3 個目以降も同じ差分で連続しているか。
5. 方向がレベルの `validationDirections` に含まれるか。
6. 値の並びが `a + b = c` または `a - b = c` として成立するか。

成立した場合は、方向、演算、値、表示用の式を返す。

不成立の場合は、UI が扱いやすいように reason を返す。

## board.js との関係

`src/board.js` の候補スキャンも式の評価には `MathBlockPuzzleRules.evaluateEquation()` を使う。

盤面生成側は「直線上の値が式として成立するか」を使うだけで、プレイヤー入力の選択数・連続性・選択状態は `rules.js` 側に閉じる。

## 方向

方向は選択順から決まる。

- `left-to-right`: row 差分 0、col 差分 +1
- `right-to-left`: row 差分 0、col 差分 -1
- `top-to-bottom`: row 差分 +1、col 差分 0
- `bottom-to-top`: row 差分 -1、col 差分 0

LV1 から全方向を許可する。方向だけを理由に、見つけた成立式を不正解にしないため。

## テスト方針

- 足し算成立。
- 引き算成立。
- 引き算の順序不一致。
- 4 方向すべての成立。
- 3 個以外、斜め、非連続、値なしの不成立。
- `board.js` の候補スキャンが同じ式評価を使い続けること。
