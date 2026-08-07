import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import {
  ScryfallApiError,
  getCardByUrl,
  getCardLanguages,
  getCardPrints,
  parseScryfallUrl,
  searchCards,
} from '../lib/scryfall'
import CardLookup from './CardLookup'

vi.mock('../lib/scryfall', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/scryfall')>()
  return {
    ...actual,
    parseScryfallUrl: vi.fn(),
    getCardByUrl: vi.fn(),
    searchCards: vi.fn(),
    getCardPrints: vi.fn(),
    getCardLanguages: vi.fn(),
  }
})

const card = makeCard()

async function submit(query: string) {
  await userEvent.type(screen.getByPlaceholderText(/Paste a Scryfall/), query)
  await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
}

describe('CardLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(parseScryfallUrl).mockReturnValue(null)
    vi.mocked(getCardPrints).mockResolvedValue([card])
    vi.mocked(getCardLanguages).mockResolvedValue([card])
  })

  it('does nothing on submit when the query is blank', async () => {
    render(<CardLookup onCardConfirmed={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(searchCards).not.toHaveBeenCalled()
  })

  it('searches by name and shows a single result directly as a preview', async () => {
    vi.mocked(searchCards).mockResolvedValue({ object: 'list', has_more: false, data: [card] })
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('Cold-Eyed Selkie')

    expect(searchCards).toHaveBeenCalledWith('Cold-Eyed Selkie')
    expect(await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })).toBeInTheDocument()
  })

  it('shows a results list when the search matches more than one card, and selecting one shows its preview', async () => {
    const other = makeCard({ id: 'other', name: 'Cold-Eyed Selkie', set: 'lea', collector_number: '1' })
    vi.mocked(searchCards).mockResolvedValue({ object: 'list', has_more: false, data: [card, other] })
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('Cold-Eyed Selkie')

    const options = await screen.findAllByRole('button', { name: /Cold-Eyed Selkie/ })
    expect(options).toHaveLength(2)

    await userEvent.click(options[1])
    expect(await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })).toBeInTheDocument()
  })

  it('shows a message when the search matches nothing', async () => {
    vi.mocked(searchCards).mockResolvedValue({ object: 'list', has_more: false, data: [] })
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('Not A Real Card')

    expect(await screen.findByText('No matching cards found.')).toBeInTheDocument()
  })

  it('resolves a pasted Scryfall url directly, bypassing search', async () => {
    vi.mocked(parseScryfallUrl).mockReturnValue({ set: 'afc', number: '183', lang: undefined })
    vi.mocked(getCardByUrl).mockResolvedValue(card)
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('https://scryfall.com/card/afc/183/cold-eyed-selkie')

    expect(getCardByUrl).toHaveBeenCalledWith('https://scryfall.com/card/afc/183/cold-eyed-selkie')
    expect(searchCards).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })).toBeInTheDocument()
  })

  it('shows the Scryfall error message for a known API error', async () => {
    vi.mocked(searchCards).mockRejectedValue(
      new ScryfallApiError({ object: 'error', status: 404, code: 'not_found', details: 'No such card.' }),
    )
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('???')

    expect(await screen.findByText('No such card.')).toBeInTheDocument()
  })

  it('shows a generic error message for a non-Scryfall failure', async () => {
    vi.mocked(searchCards).mockRejectedValue(new TypeError('network down'))
    render(<CardLookup onCardConfirmed={() => {}} />)

    await submit('anything')

    expect(await screen.findByText('Could not reach Scryfall. Please try again.')).toBeInTheDocument()
  })

  it('clears back to the search form when "Look up a different card" is clicked', async () => {
    vi.mocked(searchCards).mockResolvedValue({ object: 'list', has_more: false, data: [card] })
    render(<CardLookup onCardConfirmed={() => {}} />)
    await submit('Cold-Eyed Selkie')
    await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })

    await userEvent.click(screen.getByRole('button', { name: 'Look up a different card' }))

    expect(screen.queryByRole('heading', { name: 'Cold-Eyed Selkie' })).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Paste a Scryfall/)).toHaveValue('')
  })

  it('passes the resolved card to onCardConfirmed via the preview\'s confirm button', async () => {
    vi.mocked(searchCards).mockResolvedValue({ object: 'list', has_more: false, data: [card] })
    const onCardConfirmed = vi.fn()
    render(<CardLookup onCardConfirmed={onCardConfirmed} />)
    await submit('Cold-Eyed Selkie')
    await screen.findByRole('heading', { name: 'Cold-Eyed Selkie' })

    await userEvent.click(screen.getByRole('button', { name: 'Report an issue with this printing' }))

    expect(onCardConfirmed).toHaveBeenCalledWith(card)
  })
})
