import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import { getCardLanguages, type ScryfallCard } from '../lib/scryfall'
import LanguagePreview from './LanguagePreview'

vi.mock('../lib/scryfall', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/scryfall')>()),
  getCardLanguages: vi.fn(),
}))

describe('LanguagePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts to pick a language when none is selected yet', () => {
    vi.mocked(getCardLanguages).mockResolvedValue([makeCard()])
    render(<LanguagePreview card={makeCard()} language={undefined} />)
    expect(screen.getByText(/Pick a language above/)).toBeInTheDocument()
  })

  it('shows the image for the selected language once fetched', async () => {
    const card = makeCard()
    const frenchPrinting = makeCard({
      id: 'card-fr',
      lang: 'fr',
      image_uris: { ...card.image_uris!, normal: 'https://example.com/fr-normal.png' },
    })
    vi.mocked(getCardLanguages).mockResolvedValue([card, frenchPrinting])

    render(<LanguagePreview card={card} language="fr" />)

    expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://example.com/fr-normal.png')
    expect(getCardLanguages).toHaveBeenCalledWith(card)
  })

  it('shows a "no image found" hint when the selected language has no printing/image', async () => {
    const card = makeCard()
    vi.mocked(getCardLanguages).mockResolvedValue([card])

    render(<LanguagePreview card={card} language="de" />)

    expect(await screen.findByText(/No image found on Scryfall/)).toBeInTheDocument()
  })

  it('falls back to the "no image found" state if the languages fetch fails', async () => {
    const card = makeCard()
    vi.mocked(getCardLanguages).mockRejectedValue(new Error('boom'))

    render(<LanguagePreview card={card} language="de" />)

    expect(await screen.findByText(/No image found on Scryfall/)).toBeInTheDocument()
  })

  it('re-fetches and stops showing the previous card while a new card loads', async () => {
    const cardA = makeCard({ id: 'card-a', lang: 'en' })
    const cardB = makeCard({ id: 'card-b', set: 'woe' })
    vi.mocked(getCardLanguages).mockResolvedValueOnce([cardA])
    const { rerender } = render(<LanguagePreview card={cardA} language="en" />)
    expect(await screen.findByRole('img')).toBeInTheDocument()

    let resolveB: (value: ScryfallCard[]) => void = () => {}
    vi.mocked(getCardLanguages).mockReturnValueOnce(new Promise((resolve) => (resolveB = resolve)))
    rerender(<LanguagePreview card={cardB} language="en" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Loading preview…')).toBeInTheDocument()

    resolveB([cardB])
    expect(await screen.findByRole('img')).toBeInTheDocument()
  })
})
