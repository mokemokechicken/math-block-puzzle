# ゲーム設定 設計

## 構成

`src/config.js` にゲーム設定を集約する。

```text
MathBlockPuzzleConfig
├── NUMBER_RANGE
├── OPERATIONS
├── DIRECTIONS
├── LEVELS
├── getLevelConfig()
├── getDirection()
├── isOperationAllowed()
├── isValidationDirection()
└── isGuaranteedDirection()
```

## classic script 方針

#1 で `file://` 直開きに対応したため、`src/config.js` も classic script として読み込む。

Node.js のテストからも同じ設定を確認できるように、`globalThis.MathBlockPuzzleConfig` に公開する。

## 正解判定方向と保証配置方向

正解判定方向と保証配置方向は分ける。

- 正解判定方向: プレイヤーが見つけた式を正解として受け付ける方向。
- 保証配置方向: 盤面生成時に最低保証正解数を満たすために埋め込む方向。

LV1 から正解判定は全方向を許可する。方向だけを理由に、見つけた成立式を不正解にしないため。

一方で、LV1/LV2 の保証正解は左から右、上から下に配置する。最初の難易度では、読みやすい方向に解ける式が必ず見えるようにするため。

## レベル

| レベル | 演算 | 盤面 | 最低保証数 | 保証配置 |
| --- | --- | --- | --- | --- |
| 1 | 足し算 | 4 x 4 | 4 | 左から右、上から下 |
| 2 | 足し算、引き算 | 5 x 5 | 4 | 左から右、上から下 |
| 3 | 足し算、引き算 | 5 x 5 | 3 | 全方向 |
| 4 | 足し算、引き算 | 5 x 5 | 2 | 全方向 |

## テスト方針

- `NUMBER_RANGE` が `1..18` で `0` を含まないことを確認する。
- LV1 から正解判定方向が全方向であることを確認する。
- LV1/LV2 の保証配置が読みやすい方向だけであることを確認する。
- LV3/LV4 の保証配置が全方向であることを確認する。
- 未知の level/direction が明示的に失敗することを確認する。
