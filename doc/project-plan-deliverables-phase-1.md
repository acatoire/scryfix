# Phase 1 — Wizard UX + Report Generation

Delivered and validated **one task at a time**, in this order — each step should be reviewable/demoable on its own
before moving to the next. Nothing in Phase 1 touches the GitHub API; the goal is to validate the wizard UX and report
format on a live, deployed static site first.

1. Card lookup + preview (via Scryfall API, URL-paste and search).
2. **One** wizard: `missing_image_language` (the other wizards move to Phase 3, delivered independently — see §11).
3. Report schema v1.0 + JSON generation.
4. Manual "copy report" fallback (no GitHub required) — lets the whole wizard + report generation be validated
   end-to-end without any GitHub work.
5. Deploy to GitHub Pages via Actions — ships Phase 1 as a live, usable tool (report generation + manual copy) before
   any GitHub write-access work begins.

The `other` structured fallback wizard also moves to Phase 3 (§11) — Phase 1 stays focused on proving the single
`missing_image_language` path end to end, including a real deployment.
