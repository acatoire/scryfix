import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import type { Report } from '../report/types'
import StatsDashboard from './StatsDashboard'

vi.mock('../lib/githubRead', () => ({
  listOpenPullRequests: vi.fn(),
  findReportJsonPath: vi.fn(),
  getRawJson: vi.fn(),
  getStatsHistory: vi.fn(),
  rawFileUrl: (owner: string, repo: string, ref: string, path: string) =>
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
}))

const { findReportJsonPath, getRawJson, getStatsHistory, listOpenPullRequests } = await import('../lib/githubRead')

function makeReport(overrides: Partial<Report> = {}): Report {
  const card = makeCard()
  return {
    schema_version: '1.0',
    report_id: 'report-1',
    created_at: '2026-01-01T00:00:00.000Z',
    error_type: 'missing_image_language',
    card: {
      set: card.set,
      collector_number: card.collector_number,
      scryfall_id: card.id,
      name: card.name,
      lang: card.lang,
      scryfall_url: card.scryfall_uri,
    },
    unlisted: { is_unlisted: false, set_code: null, collector_number_hash: null },
    details: {},
    description: '',
    evidence: [],
    fix_files: [],
    external_refs: [],
    reporter: { github_username: null },
    incomplete: false,
    missing: [],
    ...overrides,
  }
}

describe('StatsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStatsHistory).mockResolvedValue([])
  })

  it('shows a loading state, then no-open-PRs message when there are none', async () => {
    vi.mocked(listOpenPullRequests).mockResolvedValue([])
    render(
      <MemoryRouter>
        <StatsDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading open pull requests…')).toBeInTheDocument()
    expect(await screen.findByText('No open pull requests right now.')).toBeInTheDocument()
  })

  it('lists an open PR, marking it ready when the report is complete', async () => {
    vi.mocked(listOpenPullRequests).mockResolvedValue([
      {
        number: 12,
        title: 'x',
        htmlUrl: 'https://github.com/acatoire/scryfix/pull/12',
        headOwner: 'octocat',
        headBranch: 'report-1',
        author: 'octocat',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    vi.mocked(findReportJsonPath).mockResolvedValue('reports/afc/183/report-1.json')
    vi.mocked(getRawJson).mockResolvedValue(makeReport())

    render(
      <MemoryRouter>
        <StatsDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByTitle('Ready for review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/acatoire/scryfix/pull/12',
    )
    expect(screen.getByRole('link', { name: 'Report folder' })).toHaveAttribute(
      'href',
      'https://github.com/octocat/scryfix/tree/report-1/reports/afc/183',
    )
    expect(screen.getByRole('link', { name: 'View in app' })).toHaveAttribute(
      'href',
      '/report?owner=octocat&repo=scryfix&branch=report-1&path=reports%2Fafc%2F183%2Freport-1.json',
    )
  })

  it('marks a PR needing completion with a warning icon', async () => {
    vi.mocked(listOpenPullRequests).mockResolvedValue([
      {
        number: 13,
        title: 'x',
        htmlUrl: 'https://github.com/acatoire/scryfix/pull/13',
        headOwner: 'octocat',
        headBranch: 'report-2',
        author: 'octocat',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
    vi.mocked(findReportJsonPath).mockResolvedValue('reports/afc/183/report-2.json')
    vi.mocked(getRawJson).mockResolvedValue(makeReport({ incomplete: true, missing: ['fix_files'] }))

    render(
      <MemoryRouter>
        <StatsDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findByTitle('Needs completion — the report is missing required data')).toBeInTheDocument()
  })

  it('shows an error message when the PR list fails to load', async () => {
    vi.mocked(listOpenPullRequests).mockRejectedValue(new Error('rate limited'))
    render(
      <MemoryRouter>
        <StatsDashboard />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Could not load open pull requests from GitHub.')).toBeInTheDocument()
  })
})
