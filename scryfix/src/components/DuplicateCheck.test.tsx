import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'

const findRelatedReports = vi.fn()

vi.mock('../lib/duplicates', () => ({
  findRelatedReports: (...args: unknown[]) => findRelatedReports(...args),
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
})

describe('DuplicateCheck', () => {
  it('shows a loading state, then an empty message', async () => {
    findRelatedReports.mockResolvedValue([])
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Checking existing reports…')).toBeInTheDocument()
    expect(await screen.findByText('No existing reports for this card.')).toBeInTheDocument()
    expect(findRelatedReports).toHaveBeenCalledWith(expect.anything(), card.set, card.collector_number)
  })

  it('lists open and merged reports', async () => {
    findRelatedReports.mockResolvedValue([openReport, mergedReport])
    render(<DuplicateCheck card={card} onStart={() => {}} onCancel={() => {}} />)
    expect(await screen.findByRole('link', { name: '[missing_image_language] X' })).toHaveAttribute(
      'href',
      'https://gh/pull/7',
    )
    expect(screen.getByText('Open PR')).toBeInTheDocument()
    expect(screen.getByText('Merged')).toBeInTheDocument()
    expect(screen.getByText('(missing_image_language)')).toBeInTheDocument()
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
})
