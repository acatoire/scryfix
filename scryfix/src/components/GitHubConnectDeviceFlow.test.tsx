import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GitHubConnect from './GitHubConnect'

const mockGetAuthenticated = vi.fn()
const mockSetToken = vi.fn()
const requestDeviceCode = vi.fn()
const pollForToken = vi.fn()

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(function Octokit() {
    return { users: { getAuthenticated: mockGetAuthenticated } }
  }),
}))

vi.mock('../lib/githubAuth', () => ({
  getGitHubAuth: () => ({ getToken: vi.fn(), setToken: mockSetToken }),
}))

vi.mock('../lib/deviceFlow', () => ({
  getDeviceFlowConfig: () => ({ clientId: 'cid', relayUrl: 'https://relay.example' }),
  requestDeviceCode: (...args: unknown[]) => requestDeviceCode(...args),
  pollForToken: (...args: unknown[]) => pollForToken(...args),
}))

const deviceCode = {
  deviceCode: 'dev',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  expiresIn: 900,
  interval: 5,
}

describe('GitHubConnect (Device Flow configured)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the user code, then stores the token and reports the username', async () => {
    requestDeviceCode.mockResolvedValue(deviceCode)
    let release!: (token: string) => void
    pollForToken.mockReturnValue(new Promise<string>((resolve) => (release = resolve)))
    mockGetAuthenticated.mockResolvedValue({ data: { login: 'octocat' } })
    const onConnected = vi.fn()
    render(<GitHubConnect onConnected={onConnected} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }))
    expect(await screen.findByText('ABCD-1234')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/login/device' })).toBeInTheDocument()

    release('gho_token')
    await vi.waitFor(() => expect(onConnected).toHaveBeenCalledWith('octocat'))
    expect(mockSetToken).toHaveBeenCalledWith('gho_token')
  })

  it('shows the error and lets the user retry when sign-in fails', async () => {
    requestDeviceCode.mockResolvedValue(deviceCode)
    pollForToken.mockRejectedValue(new Error('Sign-in was denied on GitHub.'))
    render(<GitHubConnect onConnected={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }))

    expect(await screen.findByText('Sign-in was denied on GitHub.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeEnabled()
  })

  it('uses a generic message for non-Error failures', async () => {
    requestDeviceCode.mockRejectedValue('nope')
    render(<GitHubConnect onConnected={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }))

    expect(await screen.findByText('Could not sign in to GitHub.')).toBeInTheDocument()
  })
})
