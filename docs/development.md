# Development

## Commands

```bash
task install
task dev
task check
task build
task update:all
```

## Quality

- Python: `ruff check .`
- Frontend: `eslint .` + `tsc --noEmit`
- Build: `npm run build`

PR前に必ず `task check` 実行。

## CI

GitHub Actions が lint → typecheck → build を自動実行。

## PR

- `task check` 通過確認
- 小さく focused なブランチ
- README更新が必要な場合は同時に
