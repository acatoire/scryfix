import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockOctokit = {
  pulls: {
    list: vi.fn(),
    listFiles: vi.fn(),
  },
}

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(function Octokit() {
    return mockOctokit
  }),
}))

const originalFetch = global.fetch

const { findReportJsonPath, getRawJson, getStatsHistory, listOpenPullRequests, rawFileUrl } =
  await import('./githubRead')

const upstream = { owner: 'acatoire', repo: 'scryfix' }

describe('githubRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = originalFetch
  })

  describe('listOpenPullRequests', () => {
    it('maps PR list fields, deriving the fork owner from head.repo', async () => {
      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 12,
            title: '[missing_image_language] Cold-Eyed Selkie (AFC #183)',
            html_url: 'https://github.com/acatoire/scryfix/pull/12',
            head: { ref: 'report-1', label: 'octocat:report-1', repo: { owner: { login: 'octocat' } } },
            user: { login: 'octocat' },
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      })

      const result = await listOpenPullRequests(upstream)

      expect(mockOctokit.pulls.list).toHaveBeenCalledWith({
        owner: 'acatoire',
        repo: 'scryfix',
        state: 'open',
        per_page: 100,
      })
      expect(result).toEqual([
        {
          number: 12,
          title: '[missing_image_language] Cold-Eyed Selkie (AFC #183)',
          htmlUrl: 'https://github.com/acatoire/scryfix/pull/12',
          headOwner: 'octocat',
          headBranch: 'report-1',
          author: 'octocat',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ])
    })

    it('falls back to parsing head.label when head.repo is missing (deleted fork)', async () => {
      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 13,
            title: 'x',
            html_url: 'https://github.com/acatoire/scryfix/pull/13',
            head: { ref: 'report-2', label: 'ghost:report-2', repo: null },
            user: null,
            created_at: '2026-01-02T00:00:00Z',
          },
        ],
      })

      const [result] = await listOpenPullRequests(upstream)
      expect(result.headOwner).toBe('ghost')
      expect(result.author).toBeNull()
    })
  })

  describe('findReportJsonPath', () => {
    it('returns the first reports/**.json file changed by the PR', async () => {
      mockOctokit.pulls.listFiles.mockResolvedValue({
        data: [
          { filename: 'reports/afc/183/report-1_fix_1.png' },
          { filename: 'reports/afc/183/report-1.json' },
        ],
      })

      const path = await findReportJsonPath(upstream, 12)
      expect(path).toBe('reports/afc/183/report-1.json')
      expect(mockOctokit.pulls.listFiles).toHaveBeenCalledWith({
        owner: 'acatoire',
        repo: 'scryfix',
        pull_number: 12,
        per_page: 100,
      })
    })

    it('returns null when the PR touches no reports/*.json file', async () => {
      mockOctokit.pulls.listFiles.mockResolvedValue({ data: [{ filename: 'README.md' }] })
      expect(await findReportJsonPath(upstream, 12)).toBeNull()
    })
  })

  describe('rawFileUrl / getRawJson', () => {
    it('builds a raw.githubusercontent.com URL', () => {
      expect(rawFileUrl('acatoire', 'scryfix', 'report-1', 'reports/afc/183/report-1.json')).toBe(
        'https://raw.githubusercontent.com/acatoire/scryfix/report-1/reports/afc/183/report-1.json',
      )
    })

    it('fetches and parses JSON from the raw URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hello: 'world' }) })
      const result = await getRawJson('acatoire', 'scryfix', 'main', 'stats/history.json')
      expect(result).toEqual({ hello: 'world' })
    })

    it('throws when the raw fetch is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      await expect(getRawJson('acatoire', 'scryfix', 'main', 'missing.json')).rejects.toThrow('404')
    })
  })

  describe('getStatsHistory', () => {
    it('returns the parsed history array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ date: '2026-01-01', open_prs: 1, image_count: 2, repo_size_bytes: 300 }],
      })
      const history = await getStatsHistory(upstream)
      expect(history).toEqual([{ date: '2026-01-01', open_prs: 1, image_count: 2, repo_size_bytes: 300 }])
    })

    it('returns an empty array when the history file does not exist yet', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      expect(await getStatsHistory(upstream)).toEqual([])
    })
  })
})
