# 1分タイムアタック 設計

## 方針

スコア計算は純粋関数として `src/timeAttack.js` に分離し、DOM と timer は `src/main.js` で扱う。

通常モードとタイムアタックは同じ盤面生成、入力、正解判定、補充処理を共有する。違いはステージ終了条件と表示するゲーム状態だけに寄せる。

## 状態

`createGameState()` に `mode` と `timeAttack` を追加する。

- `mode`
  - `normal`: 従来の5問クリアモード。
  - `timeAttack`: 60秒スコアアタックモード。
- `timeAttack`
  - `startedAt`: countdown 開始時刻。開始前は `null`。
  - `endsAt`: countdown 終了時刻。開始前は `null`。
  - `score`: 現在スコア。
  - `cumulativeMultiplier`: 累積倍率。
  - `lastCorrectAt`: 前回正解時刻。
  - `lastGain`: 直近の獲得点。
  - `lastMultiplier`: 直近の今回倍率。

## スコア計算

`src/timeAttack.js` に次を置く。

- `calculateChainMultiplier(elapsedMs)`
- `createTimeAttackState()`
- `hasCountdownStarted(state)`
- `startCountdown(state, now)`
- `applyCorrectAnswer(state, now)`
- `getRemainingMs(state, now)`
- `isTimeUp(state, now)`

`createTimeAttackState()` は未開始状態を返す。`applyCorrectAnswer()` は、前回正解がない場合は基本点だけを加算し、countdown は開始しない。最初の正解ブロックが補充された時点で `startCountdown()` を呼び、そこから60秒を開始する。前回正解から10秒以内なら `calculateChainMultiplier()` の上乗せ分を累積し、10秒超なら累積倍率をリセットして基本点だけにする。

## UI

- `game-controls` にモード切替ボタンを追加する。
- 通常モードでは従来の Progress バーを表示する。
- タイムアタックでは、残り時間、スコア、累積倍率、直近獲得点を表示する。開始前の残り時間は 60 秒として表示する。
- タイムアタック中は5問ではクリアせず、残り時間0でタイムアップにする。
- タイムアップ時は最終スコアを表示し、「もう一回」と「次のレベル」を使えるようにする。

## タイマー

`main.js` に timer を持ち、タイムアタックの countdown 開始後だけ起動する。

- モード選択直後は timer を起動しない。
- 最初の正解ブロックを補充した後、`startCountdown()` 済みの状態を描画して timer を起動する。
- DOM 上の残り時間表示を短周期で更新する。
- 残り時間が0になったら入力 controller と補充 timer を止め、タイムアップ状態を描画する。
- 通常モードへの切替、レベル切替、リトライ、次のレベル、再描画時には timer を破棄する。

## 補充

タイムアタックでは5問クリアしない。正解後は通常通り補充して続行する。補充後に正解候補が0になった場合は、同じレベルで新しい盤面を生成して継続する。

## テスト方針

- `test/time-attack.test.js`
  - 倍率式と境界値。
  - 累積倍率と端数切り捨て。
  - 10秒超のリセット。
  - 残り時間。
- `test/board-ui.test.js`
  - モード切替 UI。
  - タイムアタック状態表示。
  - タイムアップ描画。
  - 正解時のスコア反映。
- `test/app-foundation.test.js`
  - `index.html` の script 読み込み。
