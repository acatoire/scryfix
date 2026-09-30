// GitHub OAuth Device Flow client (doc/project-plan.md §4.1). github.com's device-code and token
// endpoints send no CORS headers, so both calls go through the stateless CORS relay (relay/ at the
// repo root) — it holds no secret and no session. The resulting token is handed to the same
// `GitHubAuth` store the PAT stand-in uses, so nothing downstream changes.

export interface DeviceFlowConfig {
  clientId: string
  relayUrl: string
}

export function getDeviceFlowConfig(): DeviceFlowConfig | null {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  const relayUrl = import.meta.env.VITE_CORS_RELAY_URL as string | undefined
  if (!clientId || !relayUrl) return null
  return { clientId, relayUrl: relayUrl.replace(/\/+$/, '') }
}

export interface DeviceCode {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export class DeviceFlowError extends Error {}

const SCOPE = 'public_repo'

async function postForm(
  url: string,
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  if (!response.ok) throw new DeviceFlowError(`GitHub sign-in failed (${response.status}).`)
  return (await response.json()) as Record<string, unknown>
}

export async function requestDeviceCode(
  config: DeviceFlowConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<DeviceCode> {
  const body = await postForm(
    `${config.relayUrl}/login/device/code`,
    { client_id: config.clientId, scope: SCOPE },
    fetchImpl,
  )
  if (typeof body.device_code !== 'string' || typeof body.user_code !== 'string') {
    throw new DeviceFlowError(String(body.error_description ?? 'GitHub did not return a device code.'))
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: String(body.verification_uri ?? 'https://github.com/login/device'),
    expiresIn: Number(body.expires_in ?? 900),
    interval: Number(body.interval ?? 5),
  }
}

const sleepDefault = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface PollOptions {
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  signal?: AbortSignal
}

// Polls until the user authorizes (returns the token) or the flow ends (throws DeviceFlowError):
// `authorization_pending` keeps waiting, `slow_down` adds 5s to the interval per GitHub's rules.
export async function pollForToken(
  config: DeviceFlowConfig,
  code: DeviceCode,
  { fetchImpl = fetch, sleep = sleepDefault, signal }: PollOptions = {},
): Promise<string> {
  let intervalSeconds = code.interval
  const deadline = Date.now() + code.expiresIn * 1000
  while (Date.now() < deadline) {
    await sleep(intervalSeconds * 1000)
    if (signal?.aborted) throw new DeviceFlowError('Sign-in cancelled.')
    const body = await postForm(
      `${config.relayUrl}/login/oauth/access_token`,
      {
        client_id: config.clientId,
        device_code: code.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      },
      fetchImpl,
    )
    if (typeof body.access_token === 'string') return body.access_token
    switch (body.error) {
      case 'authorization_pending':
        break
      case 'slow_down':
        intervalSeconds += 5
        break
      case 'expired_token':
        throw new DeviceFlowError('The sign-in code expired — start again.')
      case 'access_denied':
        throw new DeviceFlowError('Sign-in was denied on GitHub.')
      default:
        throw new DeviceFlowError(String(body.error_description ?? body.error ?? 'Unknown sign-in error.'))
    }
  }
  throw new DeviceFlowError('The sign-in code expired — start again.')
}
