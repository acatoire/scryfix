# ai/

Durable, project-scoped memory for AI agents (Claude Code or otherwise) working on this repo. Checked
into git so it survives across sessions and machines, and is visible to human collaborators too.

This is **not** a replacement for `doc/` (the product/technical plan) or `CLAUDE.md` (repo-root
pointer + architecture map) — it's specifically for things that live in *history*, not in the current
code or plan: decisions made and why, gotchas hit against live external APIs, dead ends already ruled
out. Nothing here should just restate what reading the code would already tell you.

## Files

- [`decisions.md`](decisions.md) — non-obvious technical decisions and live-API quirks discovered while
  building this project, with the reasoning/evidence behind each. Read this before touching the
  Scryfall client (`src/lib/scryfall.ts`) or the wizard/report engine (`src/wizard/`, `src/report/`) —
  several of its entries are bugs that were already found and fixed once; don't reintroduce them.

## Updating this folder

- Add an entry when you hit something that cost real effort to figure out and isn't obvious from
  reading the resulting code — a live-API quirk, a rejected approach and why, a constraint from outside
  this repo (e.g. Scryfall's own behavior).
- Don't log routine feature work here — that belongs in commit messages and the `doc/` phase checklists.
- If a decision gets superseded, update or remove the entry rather than appending a correction below it.
