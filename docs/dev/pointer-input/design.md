# 入力操作 設計

## 構成

`src/input.js` に入力操作をまとめる。

```text
MathBlockPuzzleInput
├── getCellKey()
├── getStepBetweenCells()
├── getDirectionFromStep()
├── extendSelection()
├── createElementCellResolver()
└── createPointerDragController()
```

## 関心事

`extendSelection()` は DOM に依存しない純粋関数にする。

`createPointerDragController()` は Pointer Events と callback の橋渡しだけを担当する。

実際の DOM 要素からセルを取得する処理は `getCellFromEvent` として呼び出し側から注入する。これにより、#6 の UI 実装で盤面 DOM と接続しやすくする。

`setPointerCapture` 中の `pointermove` / `pointerup` は `event.target` が捕捉要素へ retarget されることがある。そのため、盤面 DOM と接続する場合は `event.target.closest(...)` だけに依存しない。`createElementCellResolver()` は `clientX/clientY` と `document.elementFromPoint()` で現在位置の要素を取り、その要素から `[data-cell-id]` を探してセルへ変換する。

`getCellFromEvent` の契約は、pointer capture 中でも現在のポインタ位置にあるセルを返すこと。セル外の場合は `null` を返す。

## 選択ルール

- 1 個目はどのセルでも選択できる。
- 2 個目は上下左右に隣接している必要がある。
- 2 個目で方向をロックする。
- 3 個目以降は同じ方向に 1 マスずつ進む場合だけ追加する。
- 最大 3 個まで。
- 直前のセルに戻った場合は、最後のセルを取り消す。
- 斜め、飛び越し、途中で曲がる動きは無視する。

## Pointer Events

- `pointerdown` で開始する。
- `pointermove` で選択を拡張する。
- `pointerup` では release 位置のセルを反映してから完了 callback を呼ぶ。
- `pointercancel` でリセットする。
- `lostpointercapture` でもリセットする。
- `setPointerCapture` が使える場合は使用する。
- active pointer が存在するとき、別の `pointerdown` は無視する。
- controller 初期化時に root の `touch-action` と `user-select` を抑止し、`destroy()` で元へ戻す。
- `destroy()` では listener を外してから pointer capture を解放し、teardown 中に外部 callback が発火しないようにする。

#5 では現在の placeholder 盤面へ controller を最小接続し、`is-selected` class で選択中のブロックを強調する。#6 では、この入力を本番の盤面 UI、式プレビュー、正解判定結果表示へ接続する。

## テスト方針

- 方向 helper。
- 直線選択の拡張。
- 斜め、飛び越し、曲がりの無視。
- 3 個上限。
- 1 つ戻る挙動。
- Pointer controller の change / complete / destroy。
- 座標ベースのセル resolver。
- 多指入力で active pointer が乗っ取られないこと。
- pointer cancel でリセットされること。
- lost pointer capture でリセットされること。
- pointerup の release 位置で戻り操作を復元できること。
- touch-action / user-select が destroy 時に復元されること。
- active drag 中の destroy で cancel callback が呼ばれないこと。
