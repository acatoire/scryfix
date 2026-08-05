# Scryfix — Technical Plan

*A community tool for reporting and fixing data errors on Scryfall.*

## 1. Vision

A mobile-first, static web app that guides users through structured wizards to report data errors on Scryfall (missing
images, wrong language tagging, unlisted printings, etc.), and turns their input into a well-formed report that is
submitted as a **GitHub Pull Request** on a dedicated repository. The repo itself becomes the open, versioned "error
database" that:

- Scryfall maintainers can review manually (small team, manual merge).
- Third-party MTG tools can consume directly (structured JSON + images).
- Users can "+1" or comment on existing reports instead of duplicating them.

No custom backend is required — GitHub *is* the backend (auth, storage, review workflow, notifications, deduplication
via PR search). One caveat: GitHub's OAuth token endpoint (`github.com/login/oauth/access_token`, used by Device Flow
polling too) has no CORS headers and doesn't support `OPTIONS`, so it can't be called directly from browser JS — a tiny
stateless CORS-relay function is needed just to forward that one call (see §4.1, §7). It holds no secret and no
session state, so this doesn't change the "no backend" nature of the app in any meaningful way.

---

## 2. High-Level Architecture

```
┌─────────────────────────────┐
│      React + Vite SPA       │
│      (GitHub Pages)         │
│                             │
│  ┌─────────────────────┐    │
│  │ Card Lookup         │───────▶ Scryfall API (read-only)
│  │(search / paste link)│    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Duplicate Check     │───────▶ GitHub Search API
│  │ open PRs + merged)  │    │      (issues/PRs + repo contents)
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Wizard Engine       │    │
│  │(JSON-config driven) │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Report Builder      │    │
│  │(schema + versioning)│    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ GitHub Client       │───────▶ GitHub OAuth Device Flow
│  │(branch, commit, PR) │    │      + REST/GraphQL API
│  └─────────────────────┘    │
└─────────────────────────────┘
                │
                ▼
   github.com/<org>/scryfix-reports
        (data repo, reviewed by small team)
```

No server component to run/maintain (no database, no session state). GitHub tokens are obtained via **Device Flow** (no
client secret needed); the code/token polling calls are relayed through a tiny stateless CORS-adding function (Cloudflare
Worker or equivalent — see §4.1/§7) since GitHub's token endpoint rejects direct browser calls. Once obtained, the token
is used directly from the browser to call the GitHub REST API (that part has normal CORS support).

---

## 3. User Flow (End to End)

1. User opens the app (link shared from phone, forum, Discord, etc.).
2. **Card lookup**: paste a Scryfall URL, or search via Scryfall API directly (name/set/number). Parsed URL format:
   ```
   https://scryfall.com/card/{set}/{number}/{lang}/{slug}
   ```
   → extract `set`, `number`, `lang` and confirm via API call to
   `GET /cards/{set}/{number}/{lang}` (or `/cards/{scryfall_id}` if we got the ID some other way).
3. App displays a **card preview** (name, set, image, existing languages) for confirmation.
4. **Duplicate/related reports check** *(Phase 3 — not in the initial MVP flow, see §11)*: app queries the GitHub repo
   (search API across open PRs
    + merged `/reports/{set}/{number}/`) for existing reports on this card. If found, user is shown a list and can:

    - 👍 react to a merged report (agree it's still valid / to raise visibility), or
    - comment "+1 / still an issue" on an open PR, or
    - proceed to file a **new, different** report if theirs doesn't match.
5. User picks an **error category**, which loads the matching **wizard config** (see §5).
6. Wizard walks through category-specific + common steps (description, evidence, external reference links).
7. **Report preview**: generated JSON + human-readable summary shown before submission.
8. **GitHub auth**: if not already signed in, Device Flow kicks in (shows a code + link to github.com/login/device); app
   polls until authorized.
9. App forks/branches, commits JSON (+ any images) to the correct path, opens a PR against the main repo, and shows the
   user a link to their PR.
10. If the user only wants to self-fill Scryfall's own form, they can instead just **copy the generated report
    text/JSON** without going through GitHub at all (kept as a fallback/manual mode).

---

## 4. GitHub Integration Details

### 4.1 Auth

n- **GitHub OAuth Device Flow**, no client secret required.
- **CORS relay needed for the token exchange**: `github.com/login/oauth/access_token` sends no
  `Access-Control-Allow-Origin` header and doesn't support `OPTIONS`, so it flat-out rejects direct browser `fetch`/XHR
  calls — confirmed by GitHub itself and widely reported
  ([community discussion](https://github.com/orgs/community/discussions/169674),
  [isaacs/github#330](https://github.com/isaacs/github/issues/330)). This blocks both the initial `device_code` request
  and the polling request (same endpoint, `grant_type=...device_code`). Fix: a tiny stateless function (Cloudflare
  Worker, Netlify/Vercel Function, etc.) that forwards the request and adds CORS headers — it holds no secret and no
  state, purely a CORS pass-through. Cloudflare's docs ship an official ["CORS header proxy" Worker
  example](https://developers.cloudflare.com/workers/) with a one-click deploy, which fits this exactly. Everything
  else (the actual REST/GraphQL calls once a token is held) goes straight from the browser to `api.github.com`, which
  does support CORS.
- Scopes needed: `public_repo` (to fork/branch/commit/PR on a public repo).
- Token kept in memory / sessionStorage only, never persisted long-term.
- Onboarding screen explains "you need a free GitHub account" with a one-time short guide (screenshots) for MTG players
  unfamiliar with GitHub.
- **Anonymous PRs are not allowed** — a GitHub sign-in is mandatory before a PR can be opened. This is the primary
  anti-spam gate: it costs an attacker a real GitHub account per abusive submission, which is a meaningfully higher bar
  than an anonymous form. (The no-GitHub "copy report" fallback in §9 doesn't bypass this — it never touches the repo,
  so there's nothing to spam.)

### 4.2 Anti-Spam / Bot Mitigation

- **Minimum wizard duration**: the app records a `wizard_started_at`
  timestamp when the card lookup step completes. Submission is blocked client-side if less than **60 seconds** have
  elapsed — a human answering the wizard honestly will always clear this; a bot filling fields instantly won't. This is
  a soft gate (easy to bypass by a determined attacker) but cheap and effective against naive spam.
- **Minimum delay between submissions per account**: before allowing a new PR, query the GitHub API for the user's most
  recent PR against this repo (`search/issues?q=repo:{org}/{repo}+type:pr+author:{username}`, sorted by created date)and
  block submission if the last one was less than **N minutes ago** (suggest starting at 5–10 minutes, tunable). Shown to
  the user as a friendly "you've just submitted one, please wait Xm" message rather than a silent failure.
- Both checks are enforced client-side only (no backend to enforce them server-side) — they raise the bar for
  casual/naive spam but a determined attacker with scripting could bypass them. If abuse becomes a real problem later, a
  GitHub Action that closes PRs violating the same rules (checked server-side, at merge-request time) would be the
  natural next layer — flagged in §8 as a later hardening step, not required for Phase 1 or Phase 2.

### 4.3 Duplicate Detection

- **Merged reports**: query repo contents at
  `/reports/{set}/{number}/` (or `/reports/_unlisted/{set}/{hash}/`) via GitHub Contents API.
- **Open PRs**: GitHub Search API,
  `search/issues?q=repo:{org}/{repo}+type:pr+state:open+{set}+{number}`, refined by checking the PR's changed files
  list.
- Both are shown together so the user always sees the full current state of
  "known issues" on that card before deciding.

### 4.4 "+1" Mechanism

- **On a merged report**: encourage a 👍 reaction on the original merge commit/PR (or on a tracking Issue auto-created
  per report — TBD in §8) — purely informational, no repo write needed beyond the reaction.
- **On an open PR**: user can post a short "confirming / still present"
  comment via the API. No new file, no new PR. App just thanks the user — no further action needed on their end.

### 4.5 Repo Layout

```
/reports/{set}/{number}/{report_id}.json
/reports/{set}/{number}/{report_id}_evidence_1.png
/reports/{set}/{number}/{report_id}_fix_1.png

/reports/_unlisted/{set}/{collector_number_or_hash}/{report_id}.json
/reports/_unlisted/{set}/{collector_number_or_hash}/{report_id}_evidence_1.png
/reports/_unlisted/{set}/{collector_number_or_hash}/{report_id}_fix_1.png
```

- `set` = Scryfall set code (e.g. `afc`), `number` = collector number (e.g. `183`), matching Scryfall's own URL
  structure for easy cross-reference.
- `_unlisted` branch used when the printing doesn't exist in Scryfall yet (`unlisted_printing` wizard, Phase 3). If the
  collector number itself is unknown at submission time, use a short hash (e.g. first 8 chars of a hash of
  name+lang+user-provided detail) as a stable folder key.
- Each PR touches exactly one report folder (one card/issue at a time) to keep review simple and diffs clean.

### 4.6 Merge Policy

- Small maintainer team reviews and merges manually — no auto-merge in v1.
- Future: could add CI validation (schema lint, image size checks) as a GitHub Action on PR open — not required for MVP
  but easy to bolt on later since it's just a repo.

---

## 5. Wizard Engine (JSON-Configured)

Each error type is defined by a small JSON config so new wizards can be added without touching app code. Common steps
are shared/reused; category-specific steps are declared per wizard.

### 5.1 Common (shared) steps

- `card_lookup` — search or paste Scryfall link, resolve + preview.
- `duplicate_check` — auto-run after lookup, before category selection.
- `description` — free text, "what's wrong, in your own words".
- `evidence` — attach screenshot (s) and/or paste reference link (s) showing the **problem itself** (e.g. a screenshot
  of Scryfall displaying the wrong image). **Always optional** — it supports the report but isn't consumed as data by
  downstream tools.
- `fix_file` — the actual **corrected asset** to apply (e.g. the correct card image, in the right resolution/format).
  This is what a downstream tool would ingest and use to overwrite/complete their own database. **Mandatory whenever the
  wizard declares it** (e.g. `missing_image_language`,
  `wrong_image_language`) — the PR can't usefully be merged without it, since there'd be nothing to actually fix the
  data with.
- `external_refs` — links to other DBs/sources that *don't* have the issue (e.g. official WotC gatherer, another card
  DB), supports multiple.

Both `evidence` and `fix_file` accept image upload and/or a URL — but only
`fix_file` can be marked `required: true` in a wizard config, and its presence should be checked before allowing PR
submission (client-side validation, since there's no server to enforce it).

### 5.2 Example wizard config shape

```json
{
  "schema_version": "1.0",
  "id": "missing_image_language",
  "title": "Missing image for a specific language",
  "steps": [
    {
      "ref": "card_lookup"
    },
    {
      "ref": "duplicate_check"
    },
    {
      "id": "language",
      "type": "select",
      "label": "Which language is missing an image?",
      "options_source": "scryfall_languages"
    },
    {
      "ref": "fix_file",
      "required": true,
      "label": "Upload the correct card image for this language/printing"
    },
    {
      "ref": "evidence",
      "required": false,
      "label": "Optional: screenshot showing the image is missing on Scryfall"
    },
    {
      "ref": "external_refs"
    },
    {
      "ref": "description",
      "required": false
    }
  ]
}
```

- `options_source: "scryfall_languages"` → dynamically pulled from Scryfall's documented language list (small static
  map, refreshed occasionally — no need for a live call each time).
- Step `type`s: `select`, `text`, `textarea`, `file`, `url_list`,
  `card_lookup` (special), `set_code_lookup` (for unlisted printing).

### 5.3 Wizard definitions (Phase 1 + Phase 2)

1. **`missing_image_language`** *(Phase 1)* — image missing for a specific language. `fix_file` **required** (the
   correct image to add); `evidence`
   optional.
2. **`wrong_image_language`** *(Phase 3)* — image exists but tagged/shown as wrong language; asks "shown as" vs "should
   be" language. `fix_file`
   **required** (correct image, if different from what's displayed) and
   `evidence` **recommended** (screenshot proving the mislabeling — useful here since the problem isn't "absence" but
   "wrong label", so a screenshot of the current state is more informative than in the missing-image case).
3. **`unlisted_printing`** *(Phase 3)* — card/printing not in Scryfall at all; asks set code (validated against
   Scryfall's set list — confirms set exists even if this exact printing doesn't), collector number (optional, can be
   unknown), language. `fix_file` **required**: the card photo itself acts as the fix data here (it's simultaneously the
   proof and the asset to ingest), so this wizard maps the "photo" requirement onto
   `fix_file` rather than `evidence`. Cross-checks existing `_unlisted`
   reports for a possible match/duplicate before creating a new hashed folder — this cross-check depends on the
   duplicate-detection work also scheduled for Phase 3 (§11).

### 5.4 "Other" wizard *(Phase 3)*

Structured, not purely free-text:

```json
{
  "id": "other",
  "steps": [
    {
      "ref": "card_lookup"
    },
    {
      "ref": "duplicate_check"
    },
    {
      "id": "category_hint",
      "type": "select",
      "label": "Which best describes the problem?",
      "options": [
        "Rules text",
        "Mana cost / color identity",
        "Type line",
        "Pricing/rarity",
        "Duplicate entries",
        "Other"
      ]
    },
    {
      "ref": "description",
      "required": true
    },
    {
      "ref": "evidence"
    },
    {
      "ref": "external_refs"
    }
  ]
}
```

This keeps free-form reports still machine-parseable (category_hint + structured description), rather than a single
blank textarea.

---

## 6. Report Schema

```json
{
  "schema_version": "1.0",
  "report_id": "uuid-v4",
  "created_at": "ISO-8601",
  "error_type": "missing_image_language",
  "card": {
    "set": "afc",
    "collector_number": "183",
    "scryfall_id": "xxxxx-xxxx-...",
    "name": "Cold-Eyed Selkie",
    "lang": "fr",
    "scryfall_url": "https://scryfall.com/card/afc/183/..."
  },
  "unlisted": {
    "is_unlisted": false,
    "set_code": null,
    "collector_number_hash": null
  },
  "details": {
    "...": "wizard-specific fields, e.g. affected_language, shown_as_language"
  },
  "description": "free text from user",
  "evidence": [
    {
      "type": "image",
      "path": "report_id_evidence_1.png"
    },
    {
      "type": "url",
      "value": "https://..."
    }
  ],
  "fix_files": [
    {
      "type": "image",
      "path": "report_id_fix_1.png",
      "purpose": "correct_card_image"
    }
  ],
  "external_refs": [
    {
      "source": "Gatherer",
      "url": "https://..."
    }
  ],
  "reporter": {
    "github_username": "optional, filled from OAuth if not anonymous"
  }
}
```

- `schema_version` lets consuming tools adapt as the format evolves.
- `details` is intentionally a free-form bag whose shape is defined per wizard id — consumers should switch on
  `error_type` to interpret it.
- `evidence` vs `fix_files` — this distinction matters most for downstream tools: `evidence` is context for human
  reviewers (proof something is wrong) and should generally be **ignored** by automated consumers.
  `fix_files` is the actual corrected data a tool should ingest to update its own database once the PR is merged. A
  wizard that requires a fix (e.g. missing/wrong image) should refuse to let the user submit without at least one
  `fix_files` entry — the app enforces this client-side per the wizard config's `required: true` flag on the `fix_file`
  step.

---

## 7. Tech Stack

- **React + Vite**, deployed to **GitHub Pages** (static, free, simple CI via GitHub Actions on push to `main`).
- No state persistence beyond the session — GitHub *is* the persistence layer; nothing is lost since a draft not yet
  submitted is just... not submitted (could add "save draft to localStorage" as a small nice-to-have, not required for
  MVP).
- Scryfall API calls: direct fetch, read-only, no auth needed.
- GitHub API calls: REST (Contents API for commits, Search API for dedup, Issues/PRs API for comments/reactions), via
  Device Flow token.
- **CORS relay** (see §4.1): one small function deployed separately from the SPA, only touched during token
  acquisition. Cloudflare Workers is a good fit — free tier, no database, official "CORS header proxy" example to
  start from.
- Since it's a plain static build, your FTP host remains a valid fallback — no GitHub Pages-specific features are
  required by the app itself, except the CORS relay which needs *some* place to run (any function host works, not
  Cloudflare-specific).

### 7.1 Starting points (not a Scryfix-specific template — none exists, compose from official pieces)

- App scaffold: `npm create vite@latest scryfix -- --template react-ts` (official Vite template, no extra opinions to
  strip out).
- Pages deploy: Vite's documented GitHub Pages recipe using `actions/deploy-pages` (official Action).
- GitHub API client: [`@octokit/rest`](https://github.com/octokit/rest.js).
- Device Flow client: [`@octokit/auth-oauth-device`](https://github.com/octokit/auth-oauth-device.js) — handles the
  polling loop; point its token-exchange requests at the CORS relay instead of `github.com` directly.
- CORS relay starting point: Cloudflare's "CORS header proxy" Worker example (has a one-click "Deploy to Cloudflare"
  button).

---

## 8. Open Items for Later (not blocking MVP)

- Whether merged reports also get a tracking GitHub Issue automatically (nicer target for 👍 reactions than a
  merged/closed PR) — worth deciding before Phase 1 ships, since it changes the "+1 on merged" target.
- CI schema validation via GitHub Actions on PR open.
- LocalStorage draft-saving for interrupted sessions.
- Rate-limit handling for anonymous Scryfall calls at scale.
- Expanding wizard catalog beyond Phase 1 (wrong text, mana cost, etc.).
- Repo size growing toward GitHub's practical limits — tracked via the Phase 2 stats dashboard, addressed in Phase 4
  (§12) once actually triggered.
- Schema migration strategy for future versions of the report format (v1.0 is the initial schema, but it will evolve as
  new wizards are added and new data needs arise).

---

## 9. Development phases

- **Phase 1 — MVP foundation:**
    - deliver the first end-to-end reporting flow, from card lookup to report file
    - [project-plan-deliverables-phase-1.md](project-plan-deliverables-phase-1.md)
- **Phase 2 — Workflow hardening:**
    - Implement github report submission, auth, and anti-spam measures.
    - [project-plan-deliverables-phase-2.md](project-plan-deliverables-phase-2.md)
- **Phase 3 — Feature expansion:**
    - New wizards, duplicate detection, and "+1" support for existing reports.
    - [project-plan-deliverables-phase-3.md](project-plan-deliverables-phase-3.md)
- **Phase 4 — Scale and polish:**
    - address longer-term hardening, growth, and quality
    - [project-plan-deliverables-phase-4.md](project-plan-deliverables-phase-4.md)


