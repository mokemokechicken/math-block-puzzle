# L字入力 設計

## 方針

入力 controller、正解判定、盤面スキャンをそれぞれ最小限に拡張する。

- `src/input.js`: 3 マス目で直前セルに隣接していれば、直線継続だけでなく直角方向への曲がりも許可する。
- `src/rules.js`: 選択 path を検証し、直線または L 字であれば式評価へ進む。
- `src/board.js`: 通常の正解候補スキャンでは L 字 placement を追加する。保証・ヒント用に `directionIds` を明示した場合は直線 placement だけを使う。

## path 判定

3 ブロック選択では、隣り合う 2 つの step を評価する。

- 2 step が同じ向きなら従来の直線。
- 2 step が縦横で直交していれば L 字。
- 斜め、飛び越し、同じセルの再利用は無効。

L 字の `directionId` は `"l-shape"` として扱う。これは保証方向やヒント方向には含めない。

## 盤面スキャン

`scanBoardForAnswers(board, level)` のように方向指定がない通常スキャンでは、既存の直線候補に L 字候補を加える。

`scanBoardForAnswers(board, level, level.guaranteedDirections, { targetOnly: true })` のように方向指定がある保証・ヒント用スキャンでは、指定された直線方向のみを調べる。

## 補充との関係

補充時の「消した 3 マスだけで次の正解を作らない」判定は、通常スキャンに L 字が含まれることで L 字にも適用される。

保証回復は `level.guaranteedDirections` の直線 placement だけで行うため、L 字型は保証数に含まれない。

## テスト方針

- `test/input.test.js`
  - L 字選択を `extendSelection()` と pointer controller で選べること。
  - 斜め、飛び越し、戻り操作が退行しないこと。
- `test/rules.test.js`
  - L 字の足し算・引き算が正解になること。
  - L 字の不成立式は不正解になること。
- `test/board.test.js`
  - 通常スキャンに L 字候補が含まれること。
  - 保証方向スキャンに L 字候補が含まれないこと。
  - 生成・補充後の保証正解が直線方向だけで維持されること。
- `test/qa-regression.test.js`
  - QA 契約として L 字正解が受け付けられること。
