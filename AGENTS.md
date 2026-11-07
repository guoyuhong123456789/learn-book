# AGENTS.md

Vue 3 + TypeScript + Vite SPA for a local-first Markdown knowledge base. The UI is Chinese.

## Commands

- `npm ci` — install from the lockfile. Use npm; `package-lock.json` is the lockfile.
- `npm run dev` — Vite dev server on http://localhost:5173.
- `npm run build` — runs `vue-tsc --noEmit` then `vite build`. This is the only typecheck/verification step.
- `npm run preview` — serve the built `dist/`.
- There is no lint, test, or formatter script. Do not invent commands; if a change needs tests, add the tooling first.
- `dist/` is generated build output. Never edit it by hand.

## Architecture

- Entry chain: `index.html` -> `src/main.ts` -> `src/App.vue` -> `src/layouts/BasicLayout.vue`.
- Routes are lazy-loaded in `src/router/index.ts`.
- `@/` maps to `src/`. The alias is declared separately in `tsconfig.json` and `vite.config.ts`; keep both in sync.
- Pinia setup stores live in `src/stores/` (`notes`, `categories`, `settings`).
- Data is browser-local only. There are no API/fetch calls in `src/`; persistence uses `localStorage` under the `km.` prefix via `src/utils/storage.ts`.
- First load seeds demo content from `src/data/seeds.ts`. Markdown bodies are in `src/data/seeds/*.md`, imported with Vite `?raw`.
- Reset data via Settings > restore seeds, or remove `km.*` keys. Clearing browser storage deletes notes.

## Sibling backend (not connected)

- `../backend` is a separate Spring Boot 3.3.5 / Java 21 / Maven app exposing `/api/*`. This frontend does not call it.
- `scripts/backend.sh` drives that sibling backend (`mvn -f ../backend/pom.xml`) and sets `JAVA_HOME`/PATH to `~/.local/opt/jdk21` and `~/.local/opt/maven/bin`; plain `java`/`mvn` may be unavailable.
- Seed Markdown is duplicated in `../backend/src/main/resources/seeds/`; keep both copies in sync when editing demo content.
- Never read, print, or commit `../backend/.env.local`.

## Conventions

- User-facing copy is Chinese (Ant Design Vue `zh_CN` + dayjs `zh-cn`). Keep new strings Chinese.
- Ant Design components are globally registered in `src/main.ts`; use `a-*` tags without importing. Import icons from `@ant-design/icons-vue`.
- Theme: `<html data-theme="light|dark">`; style with `--km-*` CSS variables from `src/styles/main.css`. Do not hard-code colors, or dark mode will break.
- Markdown uses `markdown-it` with `html: false` plus highlight.js; helpers live in `src/utils/markdown.ts`. Raw HTML in notes is not rendered.
- The editor saves with Ctrl/Cmd+S. Unsaved edits are tracked only by an in-memory snapshot; there is no route-leave guard.
