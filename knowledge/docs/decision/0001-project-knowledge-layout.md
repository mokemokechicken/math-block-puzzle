# 0001: プロジェクト知識を knowledge 配下に集約する

- 日付: 2026-07-02
- 状態: Accepted

## 背景

従来は `AGENTS.md` にプロジェクト方針がまとまり、`docs/concept.md` と `docs/dev/*` にコンセプトや feature 単位の作業メモが置かれていた。実装が進んだため、初期構想や作業中メモと、継続的に参照する設計・ルールを分ける必要がある。

## 決定

- `AGENTS.md` は薄い入口にし、重要ドキュメントへのリンクと最低限の Agent 作業ルールだけを残す。
- 長期的な知識やルールは `knowledge/` 配下に markdown で管理する。
- `knowledge/rules/` には規約や運用ルールを置く。
- `knowledge/docs/domain/` にはドメイン用語を置く。
- `knowledge/docs/design/` には現行実装を説明する設計ドキュメントを置く。
- `knowledge/docs/decision/` には意思決定記録を置く。
- `knowledge/postmortems/` にはインシデント記録を置く。
- `knowledge/skills/` には codex、claude-code など LLM Agent 用 skill の実体を置く。
- `docs/dev/` は作業中の一時メモに限定し、完了後は削除または `knowledge/` へ反映する。

## 結果

- 旧 `docs/concept.md` の恒久内容は `knowledge/docs/` へ、旧 `docs/qa/manual-checklist.md` は `knowledge/rules/` へ移した。
- 旧 `docs/dev/*` の feature 単位メモは現行設計に統合し、個別メモとしては残さない。
- `CLAUDE.md` と既存 skill ディレクトリは存在しなかったため、移動や symlink は発生していない。
