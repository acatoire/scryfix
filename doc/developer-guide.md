# Developer Quick Guide

Get the app running locally and know where things live.

## 1. Prerequisites

- Node.js 20+ (Vite 8 / current toolchain requires a recent Node).
- pnpm 11+ (repo ships a `pnpm-lock.yaml`; version pinned via `package.json`'s `packageManager` field).

## 2. Setup

```bash
git clone <repo-url>
cd scryfix   # the app lives in the scryfix/ dir, not the repo root
pnpm install
```

## 3. Common commands

Run from `scryfix`:

| Command                  | What it does                                     |
|--------------------------|---------------------------------------------------|
| `pnpm dev`               | Start Vite dev server with HMR                   |
| `pnpm run build`         | Type-check (`tsc -b`) + production build         |
| `pnpm run preview`       | Serve the production build locally               |
| `pnpm run lint`          | ESLint over the whole project                    |
| `pnpm test`              | Run the unit tests (Vitest)                      |
| `pnpm run test:coverage` | Run tests with coverage (feeds the README badge) |

## 4. Repo layout

```
scryfix/                       # repo root
├── ai/                         # durable AI-agent memory (decisions, gotchas) — see ai/README.md
├── doc/                        # project plan, phase deliverables, this guide
├── reports/                    # (future) submitted report data lives here once GitHub write flow ships
└── scryfix/                    # the actual React + Vite app — cd here for everything below
    ├── src/
    │   ├── lib/                 # framework-agnostic clients (e.g. scryfall.ts)
    │   ├── data/                 # static reference data (e.g. Scryfall language list)
    │   ├── components/          # card lookup UI (one .tsx + matching .css per component)
    │   ├── wizard/               # JSON-config-driven wizard engine + steps
    │   └── report/               # report schema v1.0 + JSON/zip generation
    └── public/                  # static assets served as-is
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
- **Unit/component tests**: [Vitest](https://vitest.dev/) + jsdom + [Testing Library](https://testing-library.com/),
  colocated as `*.test.ts`/`*.test.tsx` next to the file under test. Run with `pnpm test`. For a component that talks to
  `src/lib/scryfall.ts` (e.g. `CardLookup`), mock that module rather than hitting the real network — see
  `CardLookup.test.tsx` for the pattern (`vi.mock` with `importOriginal` to keep `ScryfallApiError` real for
  `instanceof` checks). Shared card fixtures live in `src/test-utils/scryfallFixtures.ts`. Coverage target: 80%+ lines
  (`vite.config.ts` → `test.coverage.all: true` so untested files count against the % instead of being invisible to it —
  don't remove that when adding new source files).

## 7. Deployment

`.github/workflows/deploy.yml` lints, tests, builds, and deploys `scryfix/` to GitHub Pages on every push to `main` (or
manual dispatch). `vite.config.ts` sets `base: '/scryfix/'` for production builds only — the dev server still serves
from `/`. One-time repo setting required: Settings → Pages → Source → **GitHub Actions**. Once live, the URL goes in the
root README's "Website" field.
