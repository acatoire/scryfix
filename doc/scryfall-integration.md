# Scryfall integration — CORS, CSP, rate limits, scanning guidelines

Everything Scryfix needs to respect when talking to `api.scryfall.com` / `*.scryfall.io`, per
[Scryfall's HTTP concerns doc](https://scryfall.com/docs/api/http-concerns). Read this before adding a new Scryfall call
or touching `src/lib/scryfall.ts` or the CSP in `vite.config.ts`.

## CORS

`api.scryfall.com` and all Scryfall image origins send CORS headers for `GET`/`HEAD`/`POST`/`OPTIONS`. There is nothing
Scryfix needs to configure for this — the browser automatically sends the `Origin`
header on every `fetch()`, and Scryfall's server checks it server-side. Two things **can't** be worked around if they
ever fail:

- CORS is granted based on the request's actual `Origin` header (set by the browser, matching the page's own
  protocol+domain). It is **not** based on `Referer` or a URL query parameter — Scryfall explicitly says spoofing either
  of those will not work.
- `scryfallFetch`/`scryfallFetchUrl` in `src/lib/scryfall.ts` only ever send the CORS-safelisted
  `Accept: application/json` header, so no request here ever triggers a CORS preflight (`OPTIONS`) in the first place —
  keep it that way; adding a custom header (e.g. an API key) would force a preflight and is unnecessary since the
  Scryfall API needs no auth for the endpoints Scryfix uses.

Net effect: CORS has never needed special handling in this codebase, and doesn't need any now.

## CSP (Content Security Policy)

GitHub Pages serves static files with no way to set custom HTTP response headers, so the CSP is delivered via a
`<meta http-equiv="Content-Security-Policy">` tag — injected **only into the production build**, by a small
`transformIndexHtml` plugin in `vite.config.ts` (gated on
`command === 'build'`, same pattern already used there for the `base` path).

**Why not in dev too:** `@vitejs/plugin-react`'s dev server injects an inline `<script type="module">`
React-Refresh preamble directly into `index.html`'s `<head>` on every request. A `script-src` without
`'unsafe-inline'` would block that and break `pnpm dev`. Since the CSP's only job is to protect the *deployed* site,
it's simplest and safest to only ship it in the production `dist/index.html`, where this problem doesn't exist (Vite's
dev-only preamble is never emitted in a production build) — rather than loosening the policy with `'unsafe-inline'` just
to accommodate a dev-only feature.

Directives, and why each one is there:

```
default-src 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
connect-src 'self' https://api.scryfall.com https://api.github.com https://raw.githubusercontent.com https://embed.scryfall.com;
img-src 'self' blob: https://*.scryfall.io https://raw.githubusercontent.com;
style-src 'self' https://embed.scryfall.com;
script-src 'self' https://embed.scryfall.com;
font-src 'self' https://embed.scryfall.com;
```

| Directive                                                    | Sources beyond `'self'`     | Why                                                                                                                                                                     |
|--------------------------------------------------------------|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `connect-src`                                                | `api.scryfall.com`          | Card lookup/search (`src/lib/scryfall.ts`).                                                                                                                             |
|                                                              | `api.github.com`            | PR/fork/commit write path (`src/lib/github.ts`) and the read-only stats dashboard (`src/lib/githubRead.ts`).                                                            |
|                                                              | `raw.githubusercontent.com` | Fetching a report's `report.json` (both libs above).                                                                                                                    |
|                                                              | `embed.scryfall.com`        | Per Scryfall's own published CSP spec below — not currently used (no Scryfall embeds in the app today), kept for forward compatibility.                                 |
| `img-src`                                                    | `blob:`                     | Uploaded-file previews (`URL.createObjectURL` in `AttachmentsStep`/`WizardSummary`/`ImageLightbox`) — these are same-tab, memory-only object URLs, not a network fetch. |
|                                                              | `*.scryfall.io`             | Card images (`image_uris.*` from the API — served from Scryfall's dedicated image CDN, not `api.scryfall.com`).                                                         |
|                                                              | `raw.githubusercontent.com` | Fix/evidence images rendered in `ReportView`.                                                                                                                           |
| `style-src`, `script-src`, `font-src`                        | `embed.scryfall.com`        | Same as above — part of Scryfall's published spec, unused today.                                                                                                        |
| `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | —                           | Standard hardening; the app uses no plugins, no `<base>` tag, and no form ever submits anywhere but is handled by JS (`event.preventDefault()`).                        |

Scryfall's own recommendation (merge into your CSP if you don't need the additions above):

```
connect-src
  api.scryfall.com
  embed.scryfall.com;
img-src
  *.scryfall.io
style-src
  embed.scryfall.com;
script-src
  embed.scryfall.com;
font-src
  embed.scryfall.com;
```

You do not need to grantlist Scryfall's apex domain (`scryfall.com` itself) — only the subdomains above.

**If you add a new external call or asset**, add its origin to the matching directive in
`vite.config.ts`'s CSP string and to the table above — don't just add the call and hope the CSP happens to already cover
it silently; a missing origin fails closed (blocked request, not a warning)
and is easy to miss without an explicit browser check (no headless-browser tool in this dev environment — see
`ai/decisions.md` — so verify any CSP change by deploying and checking the browser console, not just by reasoning about
it).

## Rate limits

Full spec: [scryfall.com/docs/api/rate-limits](https://scryfall.com/docs/api/rate-limits).

| Bucket                       | Endpoints                                                             | Limit                |
|------------------------------|-----------------------------------------------------------------------|----------------------|
| `throttled`                  | `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` | 2/second (500ms)     |
| *(not implemented — unused)* | `/cards/manifest`                                                     | 10/minute (10,000ms) |
| `default`                    | Everything else                                                       | 10/second (100ms)    |
| *(unlimited)*                | `*.scryfall.io` (direct file/image origins)                           | No rate limit        |

Enforced client-side in `src/lib/scryfall.ts` via a per-bucket throttle queue (`throttle()`) — every new Scryfall
endpoint must go through `scryfallFetch`/`scryfallFetchUrl` rather than calling `fetch`
directly, so it inherits this automatically. `/cards/manifest` isn't called anywhere in Scryfix today, so there's no
third bucket for its 10/minute limit yet — add one (`manifest: 10_000`) before ever calling it, don't reuse `default`'s
100ms for it.

Scryfall's other rules, not currently relevant to enforce in code but worth knowing:

- A `429 Too Many Requests` response means a 30-second lockout; **ignoring 429s is explicitly called out as not
  acceptable**, and repeated overages can get an application blocked (temporarily or permanently). Scryfix's throttle
  queue is designed to make a 429 here effectively unreachable under normal use — if one ever shows up in practice,
  that's a bug in the throttle queue, not something to patch around with a retry.
- Prices update once daily; gameplay data (names, Oracle text, mana costs) updates far less often. Fetching more
  frequently than daily doesn't yield new data.
- For bulk/rapid lookups (many cards at once, not Scryfix's per-card wizard flow), Scryfall's bulk data files are the
  documented path, not looping single-card API calls. Not applicable to Scryfix's current one-card-at-a-time wizard, but
  relevant if a future feature ever needs to process many cards.

## Scanning guidelines for submitted card images

[scryfall.com/docs/scanning-guidelines](https://scryfall.com/docs/scanning-guidelines) — Scryfall's standard for what
makes an acceptable card image submission (crop, lighting, resolution, no filters/watermarks, etc.). This is directly
relevant to the `fix_files` step in every Scryfix wizard (`missing_image_language` today, `wrong_image_language` in
Phase 3) — the whole point of that step is collecting an image a maintainer can merge in *as* the corrected Scryfall
asset, so it needs to already meet Scryfall's own bar, not just "any photo of the card."

This doc couldn't fetch that page's live content while writing this (scryfall.com returned 403 to the fetch tool used
here), so **don't treat the paragraph above as a restatement of its rules** — it's a description of the page's
*purpose*, not its content. Before relying on specifics (exact resolution, crop margins, etc.), read the live page.
Worth doing before or alongside adding help text/validation to the `fix_files` step referencing it directly (not done
yet).
