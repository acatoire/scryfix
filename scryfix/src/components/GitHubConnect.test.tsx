import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GitHubConnect from './GitHubConnect'

const mockGetAuthenticated = vi.fn()
const mockSetToken = vi.fn()

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(function Octokit() {
    return { users: { getAuthenticated: mockGetAuthenticated } }
  }),
}))

vi.mock('../lib/githubAuth', () => ({
  getGitHubAuth: () => ({ getToken: vi.fn(), setToken: mockSetToken }),
}))

describe('GitHubConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables the connect button until a token is entered', () => {
    render(<GitHubConnect onConnected={() => {}} />)
    expect(screen.getByRole('button', { name: 'Connect GitHub' })).toBeDisabled()
  })

  it('verifies the token, stores it, and reports the username on success', async () => {
    mockGetAuthenticated.mockResolvedValue({ data: { login: 'octocat' } })
    const onConnected = vi.fn()
    render(<GitHubConnect onConnected={onConnected} />)

    await userEvent.type(screen.getByLabelText('GitHub personal access token'), 'ghp_example')
    await userEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }))

    expect(mockSetToken).toHaveBeenCalledWith('ghp_example')
    expect(onConnected).toHaveBeenCalledWith('octocat')
  })

  it('shows an error and does not call onConnected when the token is invalid', async () => {
    mockGetAuthenticated.mockRejectedValue(new Error('Bad credentials'))
    const onConnected = vi.fn()
    render(<GitHubConnect onConnected={onConnected} />)

    await userEvent.type(screen.getByLabelText('GitHub personal access token'), 'bad-token')
    await userEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }))

    expect(await screen.findByText(/Could not verify that token/)).toBeInTheDocument()
    expect(onConnected).not.toHaveBeenCalled()
    expect(mockSetToken).not.toHaveBeenCalled()
  })
})
