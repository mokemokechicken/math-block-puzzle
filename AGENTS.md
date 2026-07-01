# AGENTS.md

この repo は、足し算・引き算ブロックパズルの静的 Web アプリです。

## 知識の入口

- [開発・運用ルール](knowledge/rules/development.md)
- [現行実装の設計](knowledge/docs/design/current-implementation.md)
- [将来 TODO](knowledge/docs/design/future-todos.md)
- [手動 QA チェックリスト](knowledge/rules/manual-qa-checklist.md)
- [ドメイン用語](knowledge/docs/domain/glossary.md)
- [意思決定記録](knowledge/docs/decision/0001-project-knowledge-layout.md)

## Agent 作業ルール

- 説明、docs、PR 本文は日本語で書く。
- 作業前に関連する `knowledge/` の文書を確認する。
- 動作確認や表示確認では、原則として In-App Browser を使う。
- 恒久的な知識は `knowledge/` に置く。`docs/dev/` は作業中の一時メモに限定し、完了時に削除または `knowledge/` へ反映する。
- LLM Agent 用 skill の実体は `knowledge/skills/` に置く。`.codex/skills`、`.claude/skills`、`skills` が必要な場合は symlink として扱う。

## 検証コマンド

変更後は原則として次を実行する:

```sh
npm run lint
npm run build
npm test
```

表示や操作に関わる変更では、[手動 QA チェックリスト](knowledge/rules/manual-qa-checklist.md) の該当項目も確認する。
