// Stateless CORS relay for GitHub's OAuth Device Flow (doc/project-plan.md §4.1, §7).
// github.com/login/device/code and /login/oauth/access_token send no CORS headers and don't answer
// OPTIONS, so a browser can't call them directly. This forwards exactly those two POSTs and adds the
// CORS headers. It holds no secret (Device Flow needs only the public client_id) and no state.
//
// Deploy: `cd relay && npx wrangler deploy`, with ALLOWED_ORIGIN set to the site's origin.

const ALLOWED_PATHS = new Set(['/login/device/code', '/login/oauth/access_token'])

function corsHeaders(origin, allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN
    const origin = request.headers.get('Origin') ?? ''
    const cors = corsHeaders(origin, allowedOrigin)

    if (origin !== allowedOrigin) return new Response('Forbidden origin', { status: 403, headers: cors })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const url = new URL(request.url)
    if (request.method !== 'POST' || !ALLOWED_PATHS.has(url.pathname)) {
      return new Response('Not found', { status: 404, headers: cors })
    }

    const upstream = await fetch(`https://github.com${url.pathname}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: await request.text(),
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    })
  },
}
