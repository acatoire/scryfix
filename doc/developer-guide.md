# Developer Quick Guide

Get the app running locally and know where things live.

## 1. Prerequisites

- Node.js 20+ (Vite 8 / current toolchain requires a recent Node).
- npm (repo ships a `package-lock.json`).

## 2. Setup

```bash
git clone <repo-url>
cd scryfix/scryfix   # the app lives in the nested scryfix/ dir, not the repo root
npm install
```

## 3. Common commands

Run from `scryfix/scryfix`:

| Command           | What it does                             |
|-------------------|------------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR           |
| `npm run build`   | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | ESLint over the whole project            |
| `npm test`        | Run the unit tests (Vitest)              |

## 4. Repo layout

```
scryfix/                       # repo root
├── doc/                       # project plan, phase deliverables, this guide
├── reports/                   # (future) submitted report data lives here once GitHub write flow ships
└── scryfix/                   # the actual React + Vite app — cd here for everything below
    ├── src/
    │   ├── lib/                # framework-agnostic clients (e.g. scryfall.ts)
    │   ├── components/         # UI components (one .tsx + matching .css per component)
    ├── public/                 # static assets served as-is
```

## 5. Where to read up on the project

- [`project-plan.md`](project-plan.md) — full technical plan: architecture, GitHub integration, wizard engine, report
  schema.
- [`project-plan-deliverables-phase-1.md`](project-plan-deliverables-phase-1.md) through `-phase-4.md` — checklist of
  what ships in each phase, in order. Check phase 1 first — it's the current milestone.
- Root [`README.md`](../README.md) — project pitch/description (repo metadata, not a dev guide).

## 6. Working conventions

- **One deliverable at a time.** Each checklist item in the phase docs should be independently reviewable/demoable
  before moving to the next — see the note at the top of each phase file.
- **No backend.** Everything is a static SPA; GitHub itself is the persistence/review layer (see `project-plan.md`
  §1–2). Don't introduce a server component.
- **Scryfall API calls are rate-limited client-side** in `src/lib/scryfall.ts` — `/cards/search`, `/cards/named`,
  `/cards/random`, `/cards/collection` are capped at 2/sec, everything else at 10/sec (Scryfall's documented hard
  limits). Route any new Scryfall call through that module rather than calling `fetch` directly, so the throttling stays
  centralized.
- **Styling**: plain CSS per component (no CSS framework), theme variables (`--text`, `--accent`, `--border`, etc.)
  defined in `src/index.css` and shared via `:root`, with a `prefers-color-scheme: dark` override.
- **Unit tests**: [Vitest](https://vitest.dev/), colocated as `*.test.ts` next to the file under test (e.g.
  `src/lib/scryfall.test.ts`). Run with `npm test`. Prioritize testing pure logic (URL parsing, rate limiting, API
  clients) over UI — no React component-testing setup (jsdom/Testing Library) is wired up yet.

## 7. Deployment

Not yet wired up — GitHub Pages deployment via GitHub Actions is deliverable #7 in Phase 1 (see
`project-plan-deliverables-phase-1.md`). Once live, the URL goes in the root README's "Website" field.
