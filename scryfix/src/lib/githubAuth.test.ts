import { beforeEach, describe, expect, it } from 'vitest'
import { getGitHubAuth, patAuth } from './githubAuth'

describe('patAuth', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns null when no token has been set', () => {
    expect(patAuth.getToken()).toBeNull()
  })

  it('stores and returns a token', () => {
    patAuth.setToken('ghp_example')
    expect(patAuth.getToken()).toBe('ghp_example')
  })

  it('clears the token when set to null', () => {
    patAuth.setToken('ghp_example')
    patAuth.setToken(null)
    expect(patAuth.getToken()).toBeNull()
  })

  it('getGitHubAuth returns the same pat-backed instance', () => {
    expect(getGitHubAuth()).toBe(patAuth)
  })
})
