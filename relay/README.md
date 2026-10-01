# Scryfix CORS relay

Stateless Cloudflare Worker that forwards GitHub's OAuth Device Flow calls
(`/login/device/code`, `/login/oauth/access_token`) and adds CORS headers, because github.com sends
none. No secret, no state. Only those two POST paths and only the configured origin are allowed.

## Deploy

1. Register a GitHub OAuth App (Settings → Developer settings), tick **Enable Device Flow**, note the client id.
2. `cd relay && npx wrangler deploy` (adjust `ALLOWED_ORIGIN` in `wrangler.toml` first).
3. Build the site with the two variables set — without them the app falls back to the dev PAT form:

```
VITE_GITHUB_CLIENT_ID=<client id>
VITE_CORS_RELAY_URL=https://scryfix-cors-relay.<account>.workers.dev
```

The relay origin is added to the production CSP `connect-src` automatically at build time.
