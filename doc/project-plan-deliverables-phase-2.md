# Phase 2 — GitHub Write

Adds the write path on top of the deployed Phase 1 site — turns "copy the report" into "open a PR automatically" for the
`missing_image_language`
wizard already shipped in Phase 1.

1. - [x] **Dev-only auth stand-in**: manually-pasted PAT (fine-grained, `public_repo`/fork scope) wired into the same auth
   interface Device Flow will use later. Unblocks steps 2-4 immediately — no relay dependency to build first.
   (`src/lib/githubAuth.ts` — `GitHubAuth` interface, sessionStorage-backed PAT implementation.)
   1.1 - [x] Fork/branch/commit/PR automation with the correct folder structure (§4.5) — pure `api.github.com` calls (Contents
   API, `git/refs`, `pulls`), no CORS relay involved, works fine against the PAT stand-in.
   (`src/lib/github.ts` — `submitReport()` orchestrates fork → branch → commit report.json + files → PR.
   Wired into `WizardSummary` via `src/components/GitHubConnect.tsx` — "Connect GitHub" (verifies the
   PAT, sets `reporter.github_username`) then "Submit as GitHub PR". Anti-spam gates from §4.2 (item 2
   below) aren't enforced yet, so this can already open a PR with no delay/duration check.
   `UPSTREAM_REPO` in `github.ts` points at `acatoire/scryfix` — reports live in a `/reports` folder
   inside the app's own repo, not a separate data repo; see `ai/decisions.md`.)
2. - [x] **Stats dashboard page** — a simple read-only page (built on the same static site) showing, over time:
    - List of opened PRs (with links) and their status (ready for review, need completion)
      - special icon for PR that need completion because the report is incomplete (e.g., the user didn't upload the image). (see
  Phase 1, item 3.1)
      - link to open the PR in GitHub for review/merge
      - link to open the report view in the app (to see the report details, including the uploaded image without being on GitHub)
      - link to the report folder in the repo (to see the report.json and uploaded image in the repo)
    - graph with:
      - number of open PRs awaiting review/merge
      - number of images stored in the repo (history)
      - repo size history (on-disk)

   (Added a route-based nav — `react-router-dom`'s `HashRouter` (no server rewrite needed on GitHub
   Pages), see `ai/decisions.md`. `src/pages/StatsDashboard.tsx` lists open PRs via unauthenticated
   `api.github.com` calls (`src/lib/githubRead.ts`) — no GitHub sign-in required to just view the
   dashboard — resolving each PR's `incomplete`/`missing` status straight from its own `report.json`
   (fetched off the PR's head branch via `raw.githubusercontent.com`, not from `main`). `src/pages/ReportView.tsx`
   is the "view in app" target — renders a report's card info, description, fix/evidence images, and
   external refs read-only, no auth needed. History graphs (`src/components/TimeSeriesChart.tsx`,
   hand-rolled inline SVG, no chart library) read `stats/history.json`, appended daily by the new
   `.github/workflows/stats-snapshot.yml` — a static site can't compute "over time" live, so that file
   is the one piece of dashboard data that isn't fetched fresh from the API on every visit.)
3. - [ ] Add a specific schema.json to trace history of reports schema evolution. Will allow in the future to make
     migration task. This file will be used to validate the report.json file and will be updated when a new field is
     added or removed. We will try to have only one schema.json file for all wizards as long as possible.
4. - [ ] Anti-spam checks from §4.2 (minimum wizard duration, minimum delay between submissions per account).

   Pulled via the GitHub API (Search API for PR counts, Contents/Trees API or a small scheduled GitHub Action that
   snapshots repo size into a tracked JSON file, since size isn't directly queryable per-commit via the REST API alone).
   This dashboard becomes the early-warning signal for Phase 4 (§12) — no need to guess when the repo is approaching
   GitHub's limits, since it's tracked and visible from day one.


By the end of Phase 2, the one Phase 1 wizard produces real, reviewable PRs — the full architecture is proven before
more wizards or convenience features are added.
