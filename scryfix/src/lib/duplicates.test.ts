import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getContent, search, listFiles } = vi.hoisted(() => ({
  getContent: vi.fn(),
  search: vi.fn(),
  listFiles: vi.fn(),
}))

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = { getContent }
    search = { issuesAndPullRequests: search }
    pulls = { listFiles }
  },
}))

import {
  findMergedReports,
  findMergedUnlistedReports,
  findOpenReports,
  findRelatedReports,
  findRelatedUnlistedReports,
} from './duplicates'

const upstream = { owner: 'o', repo: 'r' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ error_type: 'missing_image_language' }) })),
  )
})

describe('findMergedReports', () => {
  it('lists json files in the card folder with their error type', async () => {
    getContent.mockResolvedValue({
      data: [
        { name: 'a.json', type: 'file', html_url: 'https://gh/a.json' },
        { name: 'a_fix_1.png', type: 'file', html_url: 'https://gh/a.png' },
      ],
    })
    const result = await findMergedReports(upstream, 'woe', '287')
    expect(result).toEqual([
      {
        status: 'merged',
        title: 'a.json',
        url: 'https://gh/a.json',
        errorType: 'missing_image_language',
        prNumber: null,
      },
    ])
  })

  it('treats a 404 folder as no reports', async () => {
    getContent.mockRejectedValue({ status: 404 })
    expect(await findMergedReports(upstream, 'woe', '287')).toEqual([])
  })

  it('rethrows other errors', async () => {
    getContent.mockRejectedValue({ status: 500 })
    await expect(findMergedReports(upstream, 'woe', '287')).rejects.toEqual({ status: 500 })
  })

  it('falls back to a null error type when the raw file cannot be read', async () => {
    getContent.mockResolvedValue({ data: [{ name: 'a.json', type: 'file', html_url: 'u' }] })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    expect((await findMergedReports(upstream, 'woe', '287'))[0].errorType).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('net'))))
    expect((await findMergedReports(upstream, 'woe', '287'))[0].errorType).toBeNull()
  })

  it('returns nothing when the path is a file, not a folder', async () => {
    getContent.mockResolvedValue({ data: { name: 'x' } })
    expect(await findMergedReports(upstream, 'woe', '287')).toEqual([])
  })
})

describe('findMergedUnlistedReports', () => {
  it('lists key folders of the set', async () => {
    getContent.mockResolvedValue({
      data: [
        { name: 'abc123', type: 'dir', html_url: 'https://gh/abc123' },
        { name: 'README.md', type: 'file', html_url: 'x' },
      ],
    })
    const result = await findMergedUnlistedReports(upstream, 'xyz')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ status: 'merged', title: '_unlisted/xyz/abc123' })
  })
})

describe('findOpenReports', () => {
  it('keeps only PRs whose changed files touch the card folder', async () => {
    search.mockResolvedValue({
      data: {
        items: [
          { number: 1, title: '[missing_image_language] A', html_url: 'https://gh/pull/1' },
          { number: 2, title: 'unrelated', html_url: 'https://gh/pull/2' },
        ],
      },
    })
    listFiles.mockImplementation(async ({ pull_number }: { pull_number: number }) => ({
      data: [{ filename: pull_number === 1 ? 'reports/woe/287/x.json' : 'README.md' }],
    }))

    const result = await findOpenReports(upstream, 'woe', '287')

    expect(result).toEqual([
      {
        status: 'open',
        title: '[missing_image_language] A',
        url: 'https://gh/pull/1',
        errorType: 'missing_image_language',
        prNumber: 1,
      },
    ])
  })

  it('leaves error type null when the title has no tag', async () => {
    search.mockResolvedValue({ data: { items: [{ number: 3, title: 'plain', html_url: 'u' }] } })
    listFiles.mockResolvedValue({ data: [{ filename: 'reports/woe/287/x.json' }] })
    expect((await findOpenReports(upstream, 'woe', '287'))[0].errorType).toBeNull()
  })
})

describe('combined lookups', () => {
  it('puts open PRs before merged reports', async () => {
    getContent.mockResolvedValue({ data: [{ name: 'a.json', type: 'file', html_url: 'u' }] })
    search.mockResolvedValue({ data: { items: [{ number: 1, title: 't', html_url: 'p' }] } })
    listFiles.mockResolvedValue({ data: [{ filename: 'reports/woe/287/x.json' }] })
    const result = await findRelatedReports(upstream, 'woe', '287')
    expect(result.map((r) => r.status)).toEqual(['open', 'merged'])
  })

  it('finds unlisted reports for a set', async () => {
    getContent.mockResolvedValue({ data: [{ name: 'k', type: 'dir', html_url: 'u' }] })
    search.mockResolvedValue({ data: { items: [{ number: 5, title: 't', html_url: 'p' }] } })
    listFiles.mockResolvedValue({ data: [{ filename: 'reports/_unlisted/xyz/k/r.json' }] })
    const result = await findRelatedUnlistedReports(upstream, 'xyz')
    expect(result).toHaveLength(2)
  })
})
