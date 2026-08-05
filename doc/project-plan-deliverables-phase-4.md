# Phase 4 — Repo growth management

Unlike Phases 1–3, Phase 4 isn't planned on a timeline — it's triggered by the Phase 2 stats dashboard (§10, item 4)
showing the repo approaching GitHub's practical limits (roughly: repeatedly nearing the ~1 GB
"recommended" mark, per the notes below; or PR volume outpacing manual review capacity). Until then, storing everything
directly in the repo (as designed in Phases 1–3) is the simplest option and should stay as-is.

**Known constraints to watch for** (via the dashboard):

- Individual files are capped at 100 MB (irrelevant for card images, but worth keeping in mind if `fix_file` uploads are
  ever allowed to be raw, uncompressed scans).
- Overall repo size has no hard enforced cap, but GitHub recommends staying under ~1 GB for good performance, and may
  reach out past ~5 GB. Clone/fetch speed for reviewers *and* any downstream tool cloning the repo degrades as size
  grows well before either threshold.

**Mitigation options, to choose from once triggered** (roughly increasing in complexity):

1. **Git LFS for images** — keeps the main repo's git history small since LFS stores pointers in git and the actual
   bytes elsewhere. Adds a dependency on LFS-aware tooling for anyone (contributors, downstream consumers) fetching
   images, and LFS itself has its own storage/bandwidth quota on the free tier.
2. **Move images to GitHub Releases assets** (or external object storage like S3/R2/B2) — the JSON report keeps
   referencing an image by URL instead of a repo-relative path; keeps git history itself tiny. Still achievable via the
   GitHub API without adding a custom server, since Releases assets can be uploaded through the same API the app already
   uses.
3. **Periodic archiving** — move older merged reports' images to cold storage after a retention period, keeping the
   active/recent repo lean while older data remains accessible elsewhere.
4. **Repo splitting** — e.g. one "current year" repo plus archived year-repos, if volume is high enough that even option
   2/3 aren't enough.

None of these need to be decided now — they're deliberately deferred until the dashboard shows real numbers, so the
choice is based on actual growth rather than a guess made before the tool has any users.
