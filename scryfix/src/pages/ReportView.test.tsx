import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import type { Report } from '../report/types'
import ReportView from './ReportView'

vi.mock('../lib/githubRead', () => ({
  getRawJson: vi.fn(),
  rawFileUrl: (owner: string, repo: string, ref: string, path: string) =>
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
}))

const { getRawJson } = await import('../lib/githubRead')

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
    description: 'French image is missing.',
    evidence: [{ type: 'url', value: 'https://example.com/evidence' }],
    fix_files: [{ type: 'image', path: 'report-1_fix_1.png', purpose: 'correct_card_image' }],
    external_refs: [{ source: 'Gatherer', url: 'https://gatherer.wizards.com/x' }],
    reporter: { github_username: null },
    incomplete: false,
    missing: [],
    ...overrides,
  }
}

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/report${query}`]}>
      <ReportView />
    </MemoryRouter>,
  )
}

describe('ReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error for a malformed link missing query params', async () => {
    renderAt('')
    expect(await screen.findByText(/Missing report location/)).toBeInTheDocument()
  })

  it('renders the card, description, fix image, evidence link, and external refs', async () => {
    vi.mocked(getRawJson).mockResolvedValue(makeReport())
    renderAt('?owner=octocat&repo=scryfix&branch=report-1&path=reports%2Fafc%2F183%2Freport-1.json')

    expect(getRawJson).toHaveBeenCalledWith('octocat', 'scryfix', 'report-1', 'reports/afc/183/report-1.json')
    expect(await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })).toBeInTheDocument()
    expect(screen.getByText('French image is missing.')).toBeInTheDocument()
    expect(screen.getByAltText('report-1_fix_1.png')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/octocat/scryfix/report-1/reports/afc/183/report-1_fix_1.png',
    )
    expect(screen.getByRole('link', { name: 'https://example.com/evidence' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gatherer' })).toHaveAttribute(
      'href',
      'https://gatherer.wizards.com/x',
    )
  })

  it('shows an incomplete banner when the report is missing required data', async () => {
    vi.mocked(getRawJson).mockResolvedValue(makeReport({ incomplete: true, missing: ['fix_files'] }))
    renderAt('?owner=octocat&repo=scryfix&branch=report-1&path=reports%2Fafc%2F183%2Freport-1.json')

    expect(await screen.findByText(/Incomplete report — missing fix_files/)).toBeInTheDocument()
  })

  it('shows an error message when the report fails to load', async () => {
    vi.mocked(getRawJson).mockRejectedValue(new Error('404'))
    renderAt('?owner=octocat&repo=scryfix&branch=report-1&path=reports%2Fafc%2F183%2Freport-1.json')

    expect(await screen.findByText('Could not load this report from GitHub.')).toBeInTheDocument()
  })
})
