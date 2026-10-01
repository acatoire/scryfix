import { useState } from 'react'
import { Octokit } from '@octokit/rest'
import {
  getDeviceFlowConfig,
  pollForToken,
  requestDeviceCode,
  type DeviceCode,
  type DeviceFlowConfig,
} from '../lib/deviceFlow'
import { getGitHubAuth } from '../lib/githubAuth'

interface GitHubConnectProps {
  onConnected: (username: string) => void
}

// Real sign-in (doc/project-plan.md §4.1): show a code + link, poll GitHub through the CORS relay
// until the user authorizes. Only used once VITE_GITHUB_CLIENT_ID / VITE_CORS_RELAY_URL are set.
function DeviceFlowConnect({ config, onConnected }: GitHubConnectProps & { config: DeviceFlowConfig }) {
  const [code, setCode] = useState<DeviceCode | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setStarting(true)
    setError(null)
    try {
      const deviceCode = await requestDeviceCode(config)
      setCode(deviceCode)
      const token = await pollForToken(config, deviceCode)
      const { data: user } = await new Octokit({ auth: token }).users.getAuthenticated()
      getGitHubAuth().setToken(token)
      onConnected(user.login)
    } catch (err) {
      setCode(null)
      setError(err instanceof Error ? err.message : 'Could not sign in to GitHub.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="github-connect">
      {code ? (
        <p>
          Go to{' '}
          <a href={code.verificationUri} target="_blank" rel="noreferrer">
            {code.verificationUri}
          </a>{' '}
          and enter the code <strong>{code.userCode}</strong>. Waiting for you to authorize…
        </p>
      ) : (
        <p className="github-connect-hint">Sign in with GitHub to submit your report as a pull request.</p>
      )}
      {error && <p className="wizard-error">{error}</p>}
      {!code && (
        <button type="button" onClick={() => void handleStart()} disabled={starting}>
          Sign in with GitHub
        </button>
      )}
    </div>
  )
}

function GitHubConnect({ onConnected }: GitHubConnectProps) {
  const deviceFlowConfig = getDeviceFlowConfig()
  return deviceFlowConfig ? (
    <DeviceFlowConnect config={deviceFlowConfig} onConnected={onConnected} />
  ) : (
    <PatConnect onConnected={onConnected} />
  )
}

function PatConnect({ onConnected }: GitHubConnectProps) {
  const [token, setToken] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    setChecking(true)
    setError(null)
    try {
      const { data: user } = await new Octokit({ auth: token }).users.getAuthenticated()
      getGitHubAuth().setToken(token)
      onConnected(user.login)
    } catch {
      setError('Could not verify that token — check it has the public_repo (or fork) scope and try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <form className="github-connect" onSubmit={(event) => void handleConnect(event)}>
      <label className="wizard-field" htmlFor="github-pat">
        GitHub personal access token
        <input
          id="github-pat"
          type="password"
          autoComplete="off"
          placeholder="ghp_…"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </label>
      <p className="github-connect-hint">
        Dev-only sign-in: paste a fine-grained PAT with <code>public_repo</code>/fork scope. Kept in
        this tab's session storage only — never sent anywhere but api.github.com.
      </p>
      {error && <p className="wizard-error">{error}</p>}
      <button type="submit" disabled={checking || !token.trim()}>
        {checking ? 'Checking…' : 'Connect GitHub'}
      </button>
    </form>
  )
}

export default GitHubConnect
