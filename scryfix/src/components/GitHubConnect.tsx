import { useState } from 'react'
import { Octokit } from '@octokit/rest'
import { getGitHubAuth } from '../lib/githubAuth'

interface GitHubConnectProps {
  onConnected: (username: string) => void
}

function GitHubConnect({ onConnected }: GitHubConnectProps) {
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
