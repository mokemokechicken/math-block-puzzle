# 足し算・引き算ブロックパズル

小学校低学年向けの、足し算と引き算を自然に練習できる Web パズルゲームです。

数字ブロックを縦または横に 3 個なぞり、最後の数字を答えとして等式が成立すると、ブロックが消えて式が浮き上がります。

## 開発

この repo は GitHub Pages で配布する静的 Web アプリとして作ります。

```sh
npm run lint
npm run build
npm test
```

ブラウザでの確認観点は [手動 QA チェックリスト](knowledge/rules/manual-qa-checklist.md) にまとめます。

## ドキュメント

- [開発・運用ルール](knowledge/rules/development.md)
- [現行実装の設計](knowledge/docs/design/current-implementation.md)
- [ドメイン用語](knowledge/docs/domain/glossary.md)
- [手動 QA チェックリスト](knowledge/rules/manual-qa-checklist.md)
- [プロジェクト知識配置の意思決定](knowledge/docs/decision/0001-project-knowledge-layout.md)
