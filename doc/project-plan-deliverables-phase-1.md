# Phase 1 — Wizard UX + Report Generation

Delivered and validated **one task at a time**, in this order — each step should be reviewable/demoable on its own
before moving to the next. Nothing in Phase 1 touches the GitHub API; the goal is to validate the wizard UX and report
format on a live, deployed static site first.

1. - [x] Project setup + React/Vite skeleton + GitHub Pages deployment.
2. - [x] Card lookup + preview (via Scryfall API, URL-paste and search).
3. - [x] **One** wizard: `missing_image_language` (the other wizards move to Phase 3, delivered independently — see §11).
3.1. - [x] Wizard Upload the correct card image is required for now, add the possibility to put it optional and the report will be special as not complete the community will be able to complete it later.
4. - [x] Report schema v1.0 + JSON generation.
5. - [x] Manual "download report zip" fallback (no GitHub required) — lets the whole wizard + report generation be validated
   end-to-end without any GitHub work.
6. - [x] Deploy to GitHub Pages via Actions — ships Phase 1 as a live, usable tool (report generation + manual copy) before
   any GitHub write-access work begins.
7. - [x] Add actions for unit tests and linting, to be run on every PR. With badges on the README.
8. - [ ] Add a checkbox to also search the card on mythic.tool database. To the user to see if the card is already fixed on this database.


The `other` structured fallback wizard also moves to Phase 3 (§11) — Phase 1 stays focused on proving the single
`missing_image_language` path end to end, including a real deployment.
