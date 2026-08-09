import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '../report/types'
import type { GitHubAuth } from './githubAuth'

const mockOctokit = {
  repos: {
    createFork: vi.fn(),
    get: vi.fn(),
    createOrUpdateFileContents: vi.fn(),
  },
  git: {
    getRef: vi.fn(),
    createRef: vi.fn(),
  },
  pulls: {
    create: vi.fn(),
  },
}

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(function Octokit() {
    return mockOctokit
  }),
}))

const { GitHubClientError, buildPrBody, describeGitHubError, submitReport } = await import('./github')

function authWith(token: string | null): GitHubAuth {
  return { getToken: () => token, setToken: vi.fn() }
}

const report: Report = {
  schema_version: '1.0',
  report_id: 'report-1',
  created_at: '2026-01-01T00:00:00.000Z',
  error_type: 'missing_image_language',
  card: {
    set: 'afc',
    collector_number: '183',
    scryfall_id: 'card-1',
    name: 'Cold-Eyed Selkie',
    lang: 'fr',
    scryfall_url: 'https://scryfall.com/card/afc/183',
  },
  unlisted: { is_unlisted: false, set_code: null, collector_number_hash: null },
  details: {},
  description: 'Missing french image',
  evidence: [],
  fix_files: [],
  external_refs: [],
  reporter: { github_username: null },
  incomplete: false,
  missing: [],
}

describe('submitReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOctokit.repos.createFork.mockResolvedValue({
      data: { owner: { login: 'me' }, name: 'scryfix-reports' },
    })
    mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: 'main' } })
    mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'base-sha' } } })
    mockOctokit.git.createRef.mockResolvedValue({ data: {} })
    mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} })
    mockOctokit.pulls.create.mockResolvedValue({
      data: { html_url: 'https://github.com/org/scryfix-reports/pull/1', number: 1 },
    })
  })

  it('throws when not signed in', async () => {
    await expect(
      submitReport({
        auth: authWith(null),
        upstream: { owner: 'org', repo: 'scryfix-reports' },
        report,
        files: [],
      }),
    ).rejects.toThrow(GitHubClientError)
  })

  it('forks, branches, commits the report, and opens a PR', async () => {
    const file = new File(['pixels'], 'fix.png', { type: 'image/png' })
    const result = await submitReport({
      auth: authWith('token'),
      upstream: { owner: 'org', repo: 'scryfix-reports' },
      report,
      files: [{ path: 'report-1_fix_1.png', file }],
    })

    expect(mockOctokit.repos.createFork).toHaveBeenCalledWith({ owner: 'org', repo: 'scryfix-reports' })
    expect(mockOctokit.git.createRef).toHaveBeenCalledWith({
      owner: 'me',
      repo: 'scryfix-reports',
      ref: 'refs/heads/report-1',
      sha: 'base-sha',
    })
    expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2)
    expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: 'reports/afc/183/report-1.json', branch: 'report-1' }),
    )
    expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: 'reports/afc/183/report-1_fix_1.png', branch: 'report-1' }),
    )
    expect(mockOctokit.pulls.create).toHaveBeenCalledWith({
      owner: 'org',
      repo: 'scryfix-reports',
      base: 'main',
      head: 'me:report-1',
      title: '[missing_image_language] Cold-Eyed Selkie (AFC #183)',
      body: expect.stringContaining('Missing french image'),
    })
    expect(result).toEqual({ prUrl: 'https://github.com/org/scryfix-reports/pull/1', prNumber: 1 })
  })

  it('routes unlisted reports under reports/_unlisted/{set}/{key}', async () => {
    await submitReport({
      auth: authWith('token'),
      upstream: { owner: 'org', repo: 'scryfix-reports' },
      report: {
        ...report,
        unlisted: { is_unlisted: true, set_code: 'ttl', collector_number_hash: 'abcd1234' },
      },
      files: [],
    })

    expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'reports/_unlisted/ttl/abcd1234/report-1.json' }),
    )
  })

  it('retries fetching the default branch ref while a new fork is still cloning', async () => {
    mockOctokit.git.getRef
      .mockRejectedValueOnce(new Error('Not Found'))
      .mockResolvedValueOnce({ data: { object: { sha: 'base-sha' } } })
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    try {
      const result = await submitReport({
        auth: authWith('token'),
        upstream: { owner: 'org', repo: 'scryfix-reports' },
        report,
        files: [],
      })
      expect(mockOctokit.git.getRef).toHaveBeenCalledTimes(2)
      expect(result.prNumber).toBe(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('buildPrBody', () => {
  it('includes the card, Scryfall link, and description', () => {
    const body = buildPrBody(report)
    expect(body).toContain('Cold-Eyed Selkie')
    expect(body).toContain('AFC #183')
    expect(body).toContain('Scryfall: https://scryfall.com/card/afc/183')
    expect(body).toContain('Missing french image')
  })

  it('lists evidence, fix, and external reference links when present', () => {
    const body = buildPrBody({
      ...report,
      evidence: [{ type: 'url', value: 'https://example.com/evidence' }],
      fix_files: [{ type: 'url', value: 'https://example.com/fix' }],
      external_refs: [{ source: 'Gatherer', url: 'https://gatherer.wizards.com/x' }],
    })
    expect(body).toContain('https://example.com/evidence')
    expect(body).toContain('https://example.com/fix')
    expect(body).toContain('[Gatherer](https://gatherer.wizards.com/x)')
  })

  it('flags an incomplete report with what is missing', () => {
    const body = buildPrBody({ ...report, incomplete: true, missing: ['fix_files'] })
    expect(body).toContain('Incomplete report')
    expect(body).toContain('fix_files')
  })

  it('falls back to a placeholder when there is no description', () => {
    const body = buildPrBody({ ...report, description: '' })
    expect(body).toContain('_No description provided._')
  })
})

describe('describeGitHubError', () => {
  it('passes a GitHubClientError message straight through', () => {
    const info = describeGitHubError(new GitHubClientError('Not signed in to GitHub.'))
    expect(info).toEqual({ message: 'Not signed in to GitHub.', detail: 'Not signed in to GitHub.' })
  })

  it('formats an Octokit-shaped error using the GitHub API response body, never the request', () => {
    const info = describeGitHubError({
      name: 'HttpError',
      status: 404,
      message: 'Not Found',
      request: { headers: { authorization: 'token super-secret-pat' } },
      response: {
        status: 404,
        url: 'https://api.github.com/repos/acatoire/scryfix-reports/forks',
        data: { message: 'Not Found', documentation_url: 'https://docs.github.com/rest/repos/forks' },
      },
    })
    expect(info.message).toBe('GitHub API error 404: Not Found')
    expect(info.detail).not.toContain('super-secret-pat')
    expect(info.detail).toContain('documentation_url')
  })

  it('falls back to the error message and stack for a plain Error', () => {
    const info = describeGitHubError(new Error('network down'))
    expect(info.message).toBe('Could not submit to GitHub: network down')
    expect(info.detail).toContain('network down')
  })

  it('falls back to a generic message for a non-Error thrown value', () => {
    const info = describeGitHubError('nope')
    expect(info).toEqual({ message: 'Could not submit to GitHub.', detail: 'nope' })
  })
})
