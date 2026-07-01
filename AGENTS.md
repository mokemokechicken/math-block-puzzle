# AGENTS.md

この repo は、足し算・引き算ブロックパズルの静的 Web アプリです。

## 開発方針

- 説明、docs、PR 本文は日本語で書く。
- GitHub Pages で配布できる静的アセットとして実装する。
- 初期スコープは 3 ブロックの足し算・引き算に限定する。
- 掛け算・割り算は将来候補であり、初期実装には含めない。
- 正解判定では、左から右、右から左、上から下、下から上をすべて許可する。
- 低レベルでは、保証正解の配置だけを左から右、上から下に寄せる。

## 検証

変更後は原則として次を実行する。

```sh
npm run lint
npm run build
npm test
```

表示や操作に関わる変更では、[docs/qa/manual-checklist.md](docs/qa/manual-checklist.md) の該当項目も確認する。

## docs/dev

feature ごとに `docs/dev/{feature_name}/requirements.md` と `docs/dev/{feature_name}/design.md` を作成する。
