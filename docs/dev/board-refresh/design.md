# ブロック消去・補充 設計

## 方針

初期実装では、個別セルの落下ではなく、成功演出後に同じレベルの盤面を再生成して差し替える。

これにより、補充後も `generateBoard()` の最低保証正解数を維持できる。

## 流れ

1. `onSelectionComplete` で正解を判定する。
2. 正解なら `playSuccessAnimation()` を呼ぶ。
3. 選択セルに `is-clearing` class を付ける。
4. 盤面 root に `is-resolving` class を付け、入力を止める。
5. 成功演出の表示時間後に `renderInitialScreen()` を呼び直す。
6. 新しい seed で同じレベルの盤面を生成する。

古い refresh が後から発火して新しい盤面を上書きしないように、`scheduleBoardRefresh()` は既存 timer を解除してから新しい timer を登録する。`renderInitialScreen()` でも未発火 timer を解除する。

`clearTimeout()` だけでは既に queue に入った callback は止められないため、refresh 予約ごとに `boardRefreshToken` を進める。callback 側では予約時 token と現在 token を比較し、古い callback なら何もせず終了する。

## seed

`nextBoardSeed()` で seed を単調増加させる。

テストでは seed が増加することを確認する。

## 後続

将来、落下演出や個別補充を入れる場合も、更新後に最低保証正解数を確認する方針は維持する。
