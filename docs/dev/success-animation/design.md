# 成功演出 設計

## 構成

成功演出は `src/main.js` の UI effect として実装する。

```text
getFloatingEquationPoint()
playSuccessAnimation()
```

## 流れ

1. `onSelectionComplete` で `validateSelection()` を実行する。
2. 成立していれば `playSuccessAnimation()` を呼ぶ。
3. 選択セルに `is-correct` class を付ける。
4. 選択セルの中心位置から `floating-equation` を追加する。
5. CSS animation で式を浮かせる。
6. 一定時間後に式要素と `is-correct` を取り除く。

連続正解時に古い cleanup が新しい成功演出を消さないように、各演出に token を割り当てる。`is-correct` を外すときは、対象セルが同じ token を持っている場合だけ cleanup する。

## 位置計算

`getFloatingEquationPoint()` は、選択セルの `getBoundingClientRect()` の中心を平均し、盤面 root からの相対座標に変換する。

DOM が使えないテスト環境では fallback point を返す。

## CSS

- `.number-block.is-correct` でブロックを光らせる。
- `.floating-equation` で式を白背景の小さなラベルとして表示する。
- `@keyframes float-equation` で上に浮きながら消す。
- `prefers-reduced-motion: reduce` では animation / transition を短縮する。
- JS の cleanup timer も reduced motion 時は短縮する。ただし 1ms などの不可視に近い値にはせず、短いが成功フィードバックとして見える時間を残す。

## 後続

#8 で、成功演出後にブロック消去と補充を接続する。
