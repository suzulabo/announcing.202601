---
trigger: always_on
---

- Prioritize minimizing runtime performance cost and memory consumption
- Emphasize high readability
- Write all comments in English
- Follow the rules of `pnpm run lint` in the project root
- Run `lint` command in the root `package.json`
- If a file in `packages/` is edited, run the `check` script in the corresponding package's `package.json` if it exists

## Tech Stack

- TypeScript
- Sveltekit
  - Using Svelte5 runes
- Cloudflare workers
  - Dulable Objects(SQLite-backed)
- pnpm
  - monorepo by workspaces
  - Strict catalog mode
- tests
  - vitest
  - playwright
