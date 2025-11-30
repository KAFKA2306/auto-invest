# Development Flow (Auto Invest Dashboard)

Goal: keep the loop tight—install, run, check, ship—while letting Codex/Claude help without adding risk.

## Daily commands
- `task install` — sync Python deps via `uv` and JS deps via `npm`.
- `task dev` — runs FastAPI on 8000 and Vite on 5173.
- `task update` — refresh leverage metrics from scripts.
- `task check` — ruff lint + ESLint + TypeScript no-emit typecheck. Run before every PR.
- `task build` — production build of the frontend.

## Quality gates
- Python: `ruff check .` and `ruff format .` (already wired in `task lint/format`). Add `pytest` once tests land.
- Frontend: ESLint + `tsc --noEmit` (`npm run typecheck`). Keep Vite build green.
- Do not relax tsconfig flags further; prefer fixing types. If you need more strictness, turn on `strict: true` gradually in `tsconfig.app.json`.

## Codex CLI setup
1) コピー: `.codex/config.example.toml` を `~/.config/codex/config.toml` 等にコピー。
2) すぐ使える鍵不要MCP (デフォルトで有効):
   - Serena (リポジトリのセマンティックマップ)
   - Ultracite (ガードレール)
   - Chrome DevTools MCP / Next Devtools MCP (ブラウザ/Next ログ)
3) 鍵が要るものは鍵を入れてからコメントアウトを外す:
   - Context7 (最新ドキュメント検索), Exa (コード/記事検索), GitHub (Issue/PR操作)
4) 推奨値: `model_reasoning_effort = "medium"`。重めのリファクタ時のみ `high`。
5) `web_search_request = true` は検索が必要なときだけ活かす。検索結果のプロンプトインジェクションに注意。
6) メモリ系 MCP（mem0 など）は、忘却手順が決まってから導入する。

### 動作確認の目安
- Serena サーバー起動確認: `uvx --from git+https://github.com/oraios/serena serena --help` がヘルプを返す。
- Chrome DevTools MCP: `npx chrome-devtools-mcp@latest --version` がバージョンを表示。
- Next Devtools MCP: `npx -y next-devtools-mcp@latest --version` が正常終了。
- Ultracite MCP: `npx -y mcp-remote https://www.ultracite.ai/api/mcp/mcp --help` が接続成功ログを出せばOK。

## Notifications
- macOS example already in the config (`afplay ...`). Replace with an equivalent command for Linux/WSL/Windows if you want completion toasts.

## PR etiquette
- Run `task check` and `npm run build` before opening a PR.
- Prefer small, focused branches. Update the README when behavior or setup changes.
- If Codex or Claude touches files you didn’t expect, inspect the diff before committing—do not auto-commit assistant output.

## CI
- GitHub Actions (`.github/workflows/ci.yml`) runs: ruff lint → ESLint → TypeScript typecheck → Vite build on push/PR to `main`.
- Keep CI green locally by running `task check` + `npm run build` before pushing.
