# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Scryfix — a wizard-driven tool that turns Scryfall data errors (missing/mislabeled images, unlisted
printings, etc.) into structured reports, eventually submitted as GitHub PRs so the community and
third-party MTG tools can review/consume fixes directly. Unofficial, not affiliated with Scryfall.

Full technical plan: [`doc/project-plan.md`](doc/project-plan.md). Phased delivery checklists (what's
done, what's next): [`doc/project-plan-deliverables-phase-1.md`](doc/project-plan-deliverables-phase-1.md)
through `-phase-4.md` — check phase 1 first, it's the current milestone. Read the relevant phase file
before starting new work so you land on the next unchecked item rather than re-deriving scope.

Setup/commands/conventions: [`doc/developer-guide.md`](doc/developer-guide.md) — don't duplicate it here,
just the highlights below.

Longer-lived notes only this project's history would know (decisions, gotchas, live-API quirks):
[`ai/`](ai/) — read `ai/decisions.md` before touching the Scryfall client or the wizard/report engine.

## Commands

The app lives in the `scryfix` directory, not the repo root — `cd` there first.

```bash
npm install
npm run dev        # Vite dev server with HMR
npm run build       # tsc -b (typecheck) && vite build
npm run lint        # ESLint over the whole project
npm test            # vitest run — all tests
npx vitest run src/lib/scryfall.test.ts   # a single test file
```

No backend, no database — everything is a static SPA. GitHub itself is the eventual persistence/review
layer (Phase 2+); don't introduce a server component.

## Architecture

Four areas, each independently testable via pure functions kept out of React components:

- **`src/lib/scryfall.ts`** — the only place that talks to `api.scryfall.com`. Rate-limits itself
  per Scryfall's hard limits (2/sec for `/cards/search`, 10/sec for everything else) via a per-bucket
  throttle queue — route any new Scryfall call through this module, don't `fetch` it directly.
  `parseScryfallUrl()` distinguishes a lang-code path segment from a slug by checking it against the
  real language list, not by shape (English URLs omit the lang segment entirely; a short slug can
  otherwise look like a lang code — see `ai/decisions.md`).
- **`src/wizard/`** — the JSON-config-driven wizard engine (doc/project-plan.md §5). `types.ts` defines
  the step-kind union (`select` / `textarea` / `attachments` / `urlList`); a wizard is just a
  `WizardConfig` object (see `wizards/missingImageLanguage.ts`) — new wizards add a config file, not
  engine code. `validation.ts` holds the pure required-field logic (including the "submit as
  incomplete" skip for a required attachments step) so it's testable without mounting a component.
  `WizardEngine.tsx` steps through the config; `WizardSummary.tsx` is the review screen.
- **`src/report/`** — turns wizard answers into the report schema v1.0 (doc/project-plan.md §6).
  `buildReport.ts` is pure: it maps the "well-known" step ids (`fix_files`, `evidence`,
  `external_refs`, `description`) onto fixed schema fields, and buckets anything else into a
  wizard-specific `details` object — so a Phase 3 wizard with new fields doesn't require changes here.
  `downloadReportZip.ts` lazy-loads `jszip` (dynamic import, its own chunk) and bundles `report.json`
  plus every uploaded file into a downloadable zip, named by path convention
  `{report_id}_fix_1.png` / `{report_id}_evidence_1.png` per doc/project-plan.md §4.5.
- **`src/data/scryfallLanguages.ts`** — static mirror of Scryfall's documented language list, used both
  as wizard `select` options and as the lang-code validation set in the URL parser above.

Tests are colocated (`*.test.ts` next to the file under test) and target the pure logic layers above —
there's no component/DOM test setup (jsdom, Testing Library) in this project yet.
