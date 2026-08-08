# Phase 2 — GitHub Write

Adds the write path on top of the deployed Phase 1 site — turns "copy the report" into "open a PR automatically" for the
`missing_image_language`
wizard already shipped in Phase 1.

1. - [ ] **Dev-only auth stand-in**: manually-pasted PAT (fine-grained, `public_repo`/fork scope) wired into the same auth
   interface Device Flow will use later. Unblocks steps 2-4 immediately — no relay dependency to build first.
   1.1 - [ ] Fork/branch/commit/PR automation with the correct folder structure (§4.5) — pure `api.github.com` calls (Contents
   API, `git/refs`, `pulls`), no CORS relay involved, works fine against the PAT stand-in.
2. - [ ] Add a specific schema.json to trace history of reports schema evolution. Will allow in the future to make 
         migration task. This file will be used to validate the report.json file and will be updated when a new field is
         added or removed. We will try to have only one schema.json file for all wizards as long as possible.
2. - [ ] Anti-spam checks from §4.2 (minimum wizard duration, minimum delay between submissions per account).
3. - [ ] **Stats dashboard page** — a simple read-only page (built on the same static site) showing, over time:
    - number of open PRs awaiting review/merge
    - number of images stored in the repo (history)
    - repo size history (on-disk `.git` size)
    - link to PR that need completion because the report is incomplete (e.g., the user didn't upload the image). (see
      Phase 1, item 3.1)

   Pulled via the GitHub API (Search API for PR counts, Contents/Trees API or a small scheduled GitHub Action that
   snapshots repo size into a tracked JSON file, since size isn't directly queryable per-commit via the REST API alone).
   This dashboard becomes the early-warning signal for Phase 4 (§12) — no need to guess when the repo is approaching
   GitHub's limits, since it's tracked and visible from day one.


By the end of Phase 2, the one Phase 1 wizard produces real, reviewable PRs — the full architecture is proven before
more wizards or convenience features are added.
