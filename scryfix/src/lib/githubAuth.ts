// Dev-only auth stand-in: a manually-pasted PAT, wired into the same interface Device Flow will
// implement later (doc/project-plan-deliverables-phase-2.md item 1). Token lives in sessionStorage
// only, never persisted long-term (doc/project-plan.md §4.1) — swapping in Device Flow later means
// providing a different `GitHubAuth` implementation, nothing outside this module should change.

export interface GitHubAuth {
  getToken(): string | null
  setToken(token: string | null): void
}

const STORAGE_KEY = 'scryfix.github.pat'

export const patAuth: GitHubAuth = {
  getToken() {
    return sessionStorage.getItem(STORAGE_KEY)
  },
  setToken(token) {
    if (token) sessionStorage.setItem(STORAGE_KEY, token)
    else sessionStorage.removeItem(STORAGE_KEY)
  },
}

export function getGitHubAuth(): GitHubAuth {
  return patAuth
}
