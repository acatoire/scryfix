# Phase 3 — Wizard Enhancements

Each can be built and shipped on its own, in any order, once Phase 2's GitHub write path is working end-to-end:

1. - [ ] **Additional wizards**: `wrong_image_language`.
2. - [ ] **Additional wizards**: `other` — fallback wizard for generic reports (moved from Phase 1, §5.4).
3. - [ ] **Duplicate/related-report check** (merged + open PRs) — surfaces existing reports on a card before/while filling the
   wizard, per §4.3.
4. - [ ] **Additional wizards**: `unlisted_printing`.
5. - [ ] **CORS relay + real Device Flow auth** (§4.1) — deploy the stateless CORS-relay function (Cloudflare Worker or
      equivalent) and swap the step-1 PAT stand-in for actual Device Flow (code + link, polling through the relay,
      mandatory sign-in gate, no anonymous PRs). Last step because it's the one piece with an external deploy dependency;
      everything built in steps 2-4 already talks to `api.github.com` directly and needs no rework — only the
      token-acquisition path changes.
6. - [ ] Add a checkbox to also search the card on "mythic.tool" database. To the user to see if the card is already fixed on this database.

7. - [ ] **👍/comment flow for existing reports** — lets users confirm or bump a report they find instead of filing a new one,
   per §4.4.
8. - [ ] **Multi-card wizard**: report the same underlying issue across several cards/languages in one go — e.g. "5 language
   images missing across a single set" — without repeating the full wizard per card. Likely shape:
   one shared `description`/`external_refs`, then a repeatable
   `card_lookup` + `fix_file` block per affected card, bundled into either a single PR touching multiple report folders,
   or one PR per card generated in a batch (needs a decision once we get there — a single PR is easier to review as "one
   issue", but the current repo layout assumes one issue per folder per PR, so this will need a small schema/flow
   extension).
9. - [ ] Extend the "mythic.tool" checkbox database to a multiple database compare tool.


Items 1, 2, and 4 are all just new wizard definitions — same JSON-config mechanism from Phase 1 (§5), no new
architecture. Item 4 (`unlisted_printing`) is placed after item 3 (duplicate check) because its
"check for a possible duplicate before creating a new folder" behavior (§5.3) needs the duplicate-check feature to
already exist.

Beyond these six, other wizard candidates (not yet scoped): wrong rules text, wrong mana cost/color identity,
pricing/rarity errors, duplicate entries — same mechanism, just new wizard definitions, whenever you want to schedule
them.
