import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'

const findRelatedReports = vi.fn()
const confirmOpenReport = vi.fn()
let token: string | null = null

vi.mock('../lib/duplicates', () => ({
  findRelatedReports: (...args: unknown[]) => findRelatedReports(...args),
}))
vi.mock('../lib/github', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/github')>()),
  confirmOpenReport: (...args: unknown[]) => confirmOpenReport(...args),
}))
vi.mock('../lib/githubAuth', () => ({
  getGitHubAuth: () => ({ getToken: () => token, setToken: vi.fn() }),
}))
vi.mock('./GitHubConnect', () => ({
  default: ({ onConnected }: { onConnected: (username: string) => void }) => (
    <button type="button" onClick={() => onConnected('octocat')}>
      Fake connect
    </button>
  ),
}))

import DuplicateCheck from './DuplicateCheck'

const card = makeCard()
const openReport = {
  status: 'open',
  title: '[missing_image_language] X',
  url: 'https://gh/pull/7',
  errorType: 'missing_image_language',
  prNumber: 7,
}
const mergedReport = { status: 'merged', title: 'a.json', url: 'https://gh/a.json', errorType: null, prNumber: null }

beforeEach(() => {
  vi.clearAllMocks()
  token = null
})

describe('DuplicateCheck', () => {
  it('shows a loading state, then an empty message', async () => {
    findRelatedReports.mockResolvedValue([])
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Checking existing reports…')).toBeInTheDocument()
    expect(await screen.findByText('No existing reports for this card.')).toBeInTheDocument()
  })

  it('lists open and merged reports', async () => {
    findRelatedReports.mockResolvedValue([openReport, mergedReport])
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)
    expect(await screen.findByRole('link', { name: '[missing_image_language] X' })).toBeInTheDocument()
    expect(screen.getByText('Open PR')).toBeInTheDocument()
    expect(screen.getByText('Merged')).toBeInTheDocument()
  })

  it('lets the user continue when the lookup fails', async () => {
    findRelatedReports.mockRejectedValue(new Error('rate limited'))
    const onStart = vi.fn()
    render(<DuplicateCheck card={card} onStart={onStart} onCancel={() => {}} />)
    expect(await screen.findByText(/Could not check existing reports/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Start report' }))
    expect(onStart).toHaveBeenCalledWith('missing_image_language')
  })

  it('starts the chosen wizard', async () => {
    findRelatedReports.mockResolvedValue([])
    const onStart = vi.fn()
    render(<DuplicateCheck card={card} onStart={onStart} onCancel={() => {}} />)
    await screen.findByText('No existing reports for this card.')

    await userEvent.selectOptions(screen.getByLabelText('What kind of problem is it?'), 'Other data error')
    await userEvent.click(screen.getByRole('button', { name: 'Start report' }))
    expect(onStart).toHaveBeenCalledWith('other')
  })

  it('calls onCancel from Back', async () => {
    findRelatedReports.mockResolvedValue([])
    const onCancel = vi.fn()
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('asks to connect GitHub before confirming, then sends thumbs-up with the comment', async () => {
    findRelatedReports.mockResolvedValue([openReport])
    confirmOpenReport.mockResolvedValue(undefined)
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)

    await userEvent.click(await screen.findByRole('button', { name: '👍 Still present' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.type(screen.getByLabelText('Add a short comment (optional)'), 'still there')
    await userEvent.click(screen.getByRole('button', { name: 'Send confirmation' }))

    expect(confirmOpenReport).toHaveBeenCalledWith(expect.anything(), expect.anything(), 7, 'still there')
    expect(await screen.findByText(/thanks for confirming/)).toBeInTheDocument()
  })

  it('shows the error when confirming fails', async () => {
    token = 'abc'
    findRelatedReports.mockResolvedValue([openReport])
    confirmOpenReport.mockRejectedValue(new Error('boom'))
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)

    await userEvent.click(await screen.findByRole('button', { name: '👍 Still present' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send confirmation' }))

    expect(await screen.findByText(/boom/)).toBeInTheDocument()
  })
})
