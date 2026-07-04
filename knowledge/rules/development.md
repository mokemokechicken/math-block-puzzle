# 開発・運用ルール

## 基本方針

- 説明、docs、PR 本文は日本語で書く。
- GitHub Pages で配布できる静的アセットとして実装する。
- 外部サービスを必要としない、ルート配信可能な Web アプリとして保つ。
- JavaScript は classic script として読み込み、`file://` 直開きでも初期画面を確認できる状態を維持する。
- パッケージ追加や再インストールでは lockfile ベースを優先する。npm では `npm ci` を使う。

## スコープ

- 現行スコープは 3 ブロックの足し算・引き算に限定する。
- 掛け算・割り算は将来候補であり、現行実装には含めない。
- 正解判定では、左から右、右から左、上から下、下から上、3 ブロックの L 字型を許可する。
- 低レベルでは、保証正解の配置だけを左から右、上から下に寄せる。

## 検証

変更後は原則として次を実行する:

```sh
npm run lint
npm run build
npm test
```

表示や操作に関わる変更では、[手動 QA チェックリスト](manual-qa-checklist.md) の該当項目も確認する。

## ドキュメント

- 恒久的な開発・運用知識は `knowledge/` 配下に置く。
- `knowledge/rules/` には規約や運用ルールを置く。
- `knowledge/docs/domain/` にはドメイン用語を置く。
- `knowledge/docs/design/` には現行実装を説明する短い設計ドキュメントを置く。
- `knowledge/docs/decision/` には意思決定記録を置く。
- `knowledge/postmortems/` にはインシデント記録を置く。
- `knowledge/skills/` には codex、claude-code など LLM Agent 用 skill の実体を置く。
- `docs/dev/` は作業中の一時メモに限定する。完了後は恒久知識を `knowledge/` へ反映し、`docs/dev/` のメモは削除する。

## Agent / PR 運用

- PR 本文は `gh pr create -F <file>` または `gh api -X PATCH ... -f body=...` を使い、改行を実体として渡す。
- GitHub Actions の外部 `uses:` を追加する場合は、owner/repo@40 桁コミット SHA で固定する。
- 外部依存は `latest`、`lts`、可変タグを避け、可能な限り具体的な version、digest、commit SHA で固定する。
- 表示確認では、可能な限り In-App Browser を使う。
- LLM Agent 用 skill の実体は `knowledge/skills/` に置く。`.codex/skills`、`.claude/skills`、`skills` が必要な場合は symlink として扱い、実体を分散させない。
