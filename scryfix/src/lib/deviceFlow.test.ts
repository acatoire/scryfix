import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DeviceFlowError,
  getDeviceFlowConfig,
  pollForToken,
  requestDeviceCode,
  type DeviceCode,
} from './deviceFlow'

const config = { clientId: 'cid', relayUrl: 'https://relay.example' }
const code: DeviceCode = {
  deviceCode: 'dev',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  expiresIn: 900,
  interval: 5,
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response
}

afterEach(() => vi.unstubAllEnvs())

describe('getDeviceFlowConfig', () => {
  it('is null when env is not set', () => {
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', '')
    vi.stubEnv('VITE_CORS_RELAY_URL', '')
    expect(getDeviceFlowConfig()).toBeNull()
  })

  it('reads the client id and trims trailing slashes off the relay url', () => {
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'abc')
    vi.stubEnv('VITE_CORS_RELAY_URL', 'https://relay.example//')
    expect(getDeviceFlowConfig()).toEqual({ clientId: 'abc', relayUrl: 'https://relay.example' })
  })
})

describe('requestDeviceCode', () => {
  it('posts to the relay and maps the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        device_code: 'dev',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }),
    )
    const result = await requestDeviceCode(config, fetchImpl)
    expect(result).toEqual(code)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://relay.example/login/device/code',
      expect.objectContaining({ method: 'POST', body: 'client_id=cid&scope=public_repo' }),
    )
  })

  it('applies defaults for optional fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ device_code: 'd', user_code: 'u' }))
    expect(await requestDeviceCode(config, fetchImpl)).toMatchObject({
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
    })
  })

  it('throws on an HTTP error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
    await expect(requestDeviceCode(config, fetchImpl)).rejects.toBeInstanceOf(DeviceFlowError)
  })

  it('throws with GitHub error text when no code is returned', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error_description: 'bad client' }))
    await expect(requestDeviceCode(config, fetchImpl)).rejects.toThrow('bad client')
  })

  it('has a generic message when GitHub gives no reason', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}))
    await expect(requestDeviceCode(config, fetchImpl)).rejects.toThrow('did not return a device code')
  })
})

describe('pollForToken', () => {
  it('waits through pending responses and returns the token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'authorization_pending' }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_token' }))
    const sleep = vi.fn().mockResolvedValue(undefined)

    expect(await pollForToken(config, code, { fetchImpl, sleep })).toBe('gho_token')
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(5000)
  })

  it('backs off by 5s on slow_down', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'slow_down' }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 't' }))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollForToken(config, code, { fetchImpl, sleep })
    expect(sleep).toHaveBeenNthCalledWith(2, 10_000)
  })

  it.each([
    ['expired_token', 'expired'],
    ['access_denied', 'denied'],
    ['weird', 'weird'],
  ])('fails on %s', async (error, message) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error }))
    await expect(pollForToken(config, code, { fetchImpl, sleep: async () => {} })).rejects.toThrow(message)
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchImpl = vi.fn()
    await expect(
      pollForToken(config, code, { fetchImpl, sleep: async () => {}, signal: controller.signal }),
    ).rejects.toThrow('cancelled')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('gives up once the code has expired', async () => {
    await expect(
      pollForToken(config, { ...code, expiresIn: 0 }, { fetchImpl: vi.fn(), sleep: async () => {} }),
    ).rejects.toThrow('expired')
  })
})
