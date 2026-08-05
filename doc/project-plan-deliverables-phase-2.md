# Phase 2 — GitHub Write

Adds the write path on top of the deployed Phase 1 site — turns "copy the report" into "open a PR automatically" for the
`missing_image_language`
wizard already shipped in Phase 1.

1. GitHub Device Flow auth (incl. mandatory sign-in gate, no anonymous PRs — §4.1).
2. Fork/branch/commit/PR automation with the correct folder structure (§4.5).
3. Anti-spam checks from §4.2 (minimum wizard duration, minimum delay between submissions per account).
4. **Stats dashboard page** — a simple read-only page (built on the same static site) showing, over time:
    - number of open PRs awaiting review/merge
    - number of images stored in the repo (history)
    - repo size history (on-disk `.git` size)

   Pulled via the GitHub API (Search API for PR counts, Contents/Trees API or a small scheduled GitHub Action that
   snapshots repo size into a tracked JSON file, since size isn't directly queryable per-commit via the REST API alone).
   This dashboard becomes the early-warning signal for Phase 4 (§12) — no need to guess when the repo is approaching
   GitHub's limits, since it's tracked and visible from day one.

By the end of Phase 2, the one Phase 1 wizard produces real, reviewable PRs — the full architecture is proven before
more wizards or convenience features are added.
