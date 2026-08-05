# Phase 2 — GitHub Write

Adds the write path on top of the deployed Phase 1 site — turns "copy the report" into "open a PR automatically" for the
`missing_image_language`
wizard already shipped in Phase 1.

1. **Dev-only auth stand-in**: manually-pasted PAT (fine-grained, `public_repo`/fork scope) wired into the same auth
   interface Device Flow will use later. Unblocks steps 2-4 immediately — no relay dependency to build first.
2. Fork/branch/commit/PR automation with the correct folder structure (§4.5) — pure `api.github.com` calls (Contents
   API, `git/refs`, `pulls`), no CORS relay involved, works fine against the PAT stand-in.
3. Anti-spam checks from §4.2 (minimum wizard duration, minimum delay between submissions per account).
4. **Stats dashboard page** — a simple read-only page (built on the same static site) showing, over time:
    - number of open PRs awaiting review/merge
    - number of images stored in the repo (history)
    - repo size history (on-disk `.git` size)

   Pulled via the GitHub API (Search API for PR counts, Contents/Trees API or a small scheduled GitHub Action that
   snapshots repo size into a tracked JSON file, since size isn't directly queryable per-commit via the REST API alone).
   This dashboard becomes the early-warning signal for Phase 4 (§12) — no need to guess when the repo is approaching
   GitHub's limits, since it's tracked and visible from day one.
5. **CORS relay + real Device Flow auth** (§4.1) — deploy the stateless CORS-relay function (Cloudflare Worker or
   equivalent) and swap the step-1 PAT stand-in for actual Device Flow (code + link, polling through the relay,
   mandatory sign-in gate, no anonymous PRs). Last step because it's the one piece with an external deploy dependency;
   everything built in steps 2-4 already talks to `api.github.com` directly and needs no rework — only the
   token-acquisition path changes.

By the end of Phase 2, the one Phase 1 wizard produces real, reviewable PRs — the full architecture is proven before
more wizards or convenience features are added.
