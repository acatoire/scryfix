# Decisions & gotchas log

Chronological, most-recent first. Each entry: what was decided/found, why, and where it's implemented.

## The app dir is `scryfix/`, not a nested `scryfix/scryfix/` — verify path claims against the tree

A wrong `cd scryfix/scryfix` belief got repeated into `CLAUDE.md`, `doc/developer-guide.md`, and
`.github/workflows/deploy.yml` (`working-directory`, `cache-dependency-path`, artifact `path`). It went
unnoticed locally because shell commands used a `cd .../scryfix/scryfix 2>/dev/null || cd scryfix`
fallback that silently landed in the correct single-level `scryfix/` dir every time — so local
build/lint/test all "worked" despite the wrong mental model. The workflow YAML has no such fallback, so
it broke in CI with `Error: Some specified paths were not resolved, unable to cache dependencies.`
Lesson: a path claim repeated across docs isn't evidence it's correct if every command that used it had
a silent fallback — run `find`/`ls` from a known-clean cwd to verify the real tree before trusting it,
especially before writing something (like CI config) that has no fallback to mask the mistake.

## Report "incomplete" / "missing" fields are an extension beyond the written schema

`doc/project-plan.md` §6 doesn't mention these two fields — they were added ad hoc (phase-1 deliverable
3.1) to support submitting a report without its required fix-file, flagged for the community to
complete later. `src/report/types.ts`/`buildReport.ts` implement them; the plan doc's schema example
hasn't been updated to match. If you formalize the schema doc later, fold these in rather than treating
`buildReport.ts` as the sole source of truth.

## jszip is dynamically imported, not top-level

`src/report/downloadReportZip.ts` does `await import('jszip')` inside the function instead of a
top-level import. It's ~28KB gzipped and only needed if the user actually clicks "Download report" —
top-level import put it in the main bundle for every visitor. Keep new heavy, rarely-used deps
(zip/PDF/crypto libs, etc.) lazy the same way unless there's a reason they're needed on first paint.

## No headless-browser tool in this dev environment

Neither `chromium-cli` nor Playwright/`_electron` is available here. UI changes are verified via
`npm run lint` / `npm run build` (tsc) / `npm test`, plus live smoke tests against the real Scryfall API
via a one-off Node `fetch` script (see below) — not an actual rendered click-through. Say so explicitly
when reporting UI work as done; don't imply a browser was driven when it wasn't. If this ever gets
fixed (Playwright installed, etc.), it's worth running `/run-skill-generator` to capture the setup as a
project skill.

## Scryfall requires a real User-Agent — breaks naive Node testing, not the app itself

Node's built-in `fetch` sends a generic library User-Agent, and Scryfall hard-rejects that with a 400
`generic_user_agent` error — regardless of endpoint. Real browsers always send a full UA string, so the
deployed app is unaffected. When smoke-testing the API from a Node script/CI, spoof a UA:
`headers: { 'User-Agent': 'Mozilla/5.0 ... some-identifier/0.1' }`.

## Scryfall's canonical card URL omits the language segment for English

`/card/{set}/{number}/{slug}` (no lang segment) for English printings, but
`/card/{set}/{number}/{lang}/{slug}` for every other language. A URL parser that assumes a fixed
lang-then-slug shape and detects "is this a lang code?" purely by pattern (e.g. "2-3 lowercase letters")
will misparse or outright reject English URLs whose slug happens to be short (e.g. a card named "Fog" →
slug `fog`, which is shape-identical to a lang code). Fix: validate the segment against the *real*
Scryfall language list (`src/data/scryfallLanguages.ts`), not its shape. Implemented in
`parseScryfallUrl()` in `src/lib/scryfall.ts`; regression tests in `scryfall.test.ts` cover both the
missing-lang-segment case and the short-slug-that-looks-like-a-lang-code case.

## Scryfall's `cn:` (collector number) search filter matches loosely

`set:10e cn:2` also returns the foil `2★` variant, not just the exact `2`. Any code that fetches "all
languages of this exact printing" via search must filter the response to an exact
`collector_number === requested` match afterward — otherwise the wrong printing's language can end up
selected. See `getCardLanguages()` in `src/lib/scryfall.ts`.

## Scryfall's default search only matches English text

A free-text search for a foreign printed name (e.g. "Ange de miséricorde") 404s with no results unless
the query includes `lang:any` (or a specific `lang:xx`). `searchCards()` in `src/lib/scryfall.ts`
appends `lang:any` automatically unless the caller already specified a `lang:` qualifier.

## Scryfall's default search collapses to one printing per card name

`unique=cards` (the default `/cards/search` mode) returns only one printing per distinct card, so a
name search for a card with many reprints (e.g. "Angel of Mercy") returns just one set/printing. To
list every set version, fetch the resolved card's own `prints_search_uri` separately
(`getCardPrints()` in `src/lib/scryfall.ts`) rather than trying to get everything from one search call.

## Scryfall hard rate limits

`/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` — 2/sec (500ms). Everything else
— 10/sec (100ms). Enforced client-side via a per-bucket throttle queue in `src/lib/scryfall.ts`; route
any new Scryfall endpoint through that module (`scryfallFetch`/`scryfallFetchUrl`) rather than calling
`fetch` directly, so new calls inherit the throttling automatically.
