---
trigger: always_on
---

- Prioritize minimizing runtime performance cost and memory consumption
- Emphasize high readability
- Write all comments in English
- Follow the rules of `pnpm run lint` in the project root

## Tech Stack

- TypeScript
- Sveltekit
  - Using Svelte5 runes
- Cloudflare workers
  - Dulable Objects(SQLite-backed)
- pnpm
  - monorepo by workspaces
  - Strict catalog mode