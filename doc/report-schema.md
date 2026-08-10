# Report schema

The formal shape of a `report.json` file — one JSON Schema for every wizard, versioned, and enforced before a report
ever reaches GitHub.

**The schema file:** [`scryfix/schema/report.schema.json`](../scryfix/schema/report.schema.json)
(JSON Schema draft 2020-12). Read that file alongside this doc — this doc explains the *why*, the schema file is the
source of truth for the *what*.

## The concept

- **One schema, every wizard.** `error_type` names the wizard (`missing_image_language` today,
  `wrong_image_language`/`unlisted_printing`/`other` in Phase 3), and every field a wizard collects that *isn't* one of
  the shared ones (`description`, `evidence`, `fix_files`, `external_refs`) goes into `details` — a deliberately
  unconstrained `{"type": "object"}` in the schema. A new wizard never requires a schema change unless it adds a new
  *shared* field. See `doc/project-plan.md` §5.1/§6 for why `details` exists.
- **Everything except `details` is closed.** Every object in the schema — the report itself, `card`,
  `unlisted`, `reporter`, each attachment item — sets `"additionalProperties": false`. This is intentional strictness:
  it means `src/report/types.ts` (the TypeScript shape) and
  `schema/report.schema.json` (the validated shape) **must** be edited together. If they drift — a field added to one
  and not the other — validation starts failing on every report, loudly, instead of silently accepting a report.json
  that doesn't match what the app/other tools actually expect.
- **`schema_version` is a `const`, not a free string.** Right now it's pinned to `"1.0"`. Bumping it is the trigger for
  everything else in the "evolving the schema" section below.

## How the app actually uses it

- **`src/report/validateReport.ts`** — `async function validateReport(report): Promise<{valid, errors}>`. Lazy-loads
  `ajv/dist/2020` (the *2020-12* build — the default `Ajv` export only understands draft-07, and this schema declares
  `"$schema": ".../draft/2020-12/schema"`) and the schema JSON via dynamic `import()`, exactly like
  `downloadReportZip.ts` lazy-loads `jszip`. **This is deliberate, not incidental** — a top-level
  `import Ajv2020 from 'ajv/dist/2020'` added ~37KB gzip to the main bundle for every visitor, most of whom never submit
  a report. Compiling the validator on every call (instead of caching the compiled function at module scope) is a small,
  one-time cost per submit attempt — not a hot path, so this trade favors bundle size.
- **Wired into `WizardSummary.tsx`'s `handleSubmit()`**, *before* `submitReport()` is ever called. A failing validation
  shows the same error+"Error details" accordion UI used for a GitHub API failure (see `src/lib/github.ts`'s
  `describeGitHubError`), listing every ajv error message — but the report never reaches the network. This is a
  bug-catcher, not a user-facing validation step: if it ever fires for a real user, that means `buildReport()` produced
  something that doesn't match the schema, which is a defect in the app, not something the user did wrong. The error
  copy says exactly that.
- **`resolveJsonModule: true`** in `tsconfig.app.json` is required for `import schema from
  '../../schema/report.schema.json'` to type-check — don't remove it.

## Evolving the schema

Per the original ask for this file: *"will be updated when a new field is added or removed."* When that happens:

1. Update `src/report/types.ts` (the `Report` interface) and `schema/report.schema.json` **together**
   — `additionalProperties: false` means a mismatch fails validation immediately (see above), which is the point, but
   only if both sides actually get edited.
2. Update `buildReport.ts` if the field is populated from wizard answers rather than being fixed.
3. Add a row to the version history table below — this *is* the "trace history of reports schema evolution" the original
   checklist item asked for. Git history of the schema file is the detailed diff; this table is the human-readable index
   into it.
4. If the change is breaking for report.json files **already merged** under `/reports/` (a field renamed or removed, not
   just added), that's a migration, not just a schema edit — there's no migration tooling yet. This doc/table is the
   intended anchor point for that future work, not a promise that it's built.

### Version history

| `schema_version` | Landed    | Changes                                                                                                                                                                                                                                                                                                         |
|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `1.0`            | Phase 1–2 | Initial schema per `doc/project-plan.md` §6, plus `incomplete`/`missing` (Phase 1 item 3.1 — lets a report ship without a required `fix_files` entry, flagged for the community to complete later; see `ai/decisions.md`). Formalized into `schema/report.schema.json` + `validateReport.ts` in Phase 2 item 3. |

## Related docs

- `doc/project-plan.md` §6 — the original report schema design this formalizes.
- `ai/decisions.md` — "Report 'incomplete'/'missing' fields are an extension beyond the written schema" (now resolved:
  those fields are formally part of `1.0` in `report.schema.json`).
- `doc/scryfall-integration.md` — the sibling doc for the *other* external contract this app has (Scryfall's API), same
  idea: concept, gotchas, and what to update alongside what.
