import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import CardPreview from './CardPreview'

describe('CardPreview', () => {
  it('shows the card name, set, collector number, and language', () => {
    const card = makeCard()
    render(<CardPreview card={card} />)

    expect(screen.getByRole('heading', { name: 'Cold-Eyed Selkie' })).toBeInTheDocument()
    expect(screen.getByText(/Foundations Commander \(AFC\)/)).toBeInTheDocument()
    expect(screen.getByText('183')).toBeInTheDocument()
    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Cold-Eyed Selkie' })).toHaveAttribute(
      'src',
      card.image_uris!.normal,
    )
  })

  it('links to the card on Scryfall', () => {
    const card = makeCard()
    render(<CardPreview card={card} />)
    expect(screen.getByRole('link', { name: 'View on Scryfall' })).toHaveAttribute(
      'href',
      card.scryfall_uri,
    )
  })

  it('does not show set/language dropdowns when there is only one print/language', () => {
    render(<CardPreview card={makeCard()} prints={[makeCard()]} languages={[makeCard()]} />)
    expect(screen.queryByText('Set Switch')).not.toBeInTheDocument()
    expect(screen.queryByText('Language Switch')).not.toBeInTheDocument()
  })

  it('shows a set dropdown and calls onSelectPrint when more than one print exists', async () => {
    const current = makeCard({ id: 'a', set: 'afc' })
    const other = makeCard({ id: 'b', set: 'lea', set_name: 'Alpha' })
    const onSelectPrint = vi.fn()
    render(<CardPreview card={current} prints={[current, other]} onSelectPrint={onSelectPrint} />)

    await userEvent.selectOptions(screen.getByLabelText('Set Switch'), 'b')

    expect(onSelectPrint).toHaveBeenCalledWith(other)
  })

  it('shows a language dropdown and calls onSelectLanguage when more than one language exists', async () => {
    const current = makeCard({ id: 'a', lang: 'en' })
    const other = makeCard({ id: 'b', lang: 'fr' })
    const onSelectLanguage = vi.fn()
    render(
      <CardPreview card={current} languages={[current, other]} onSelectLanguage={onSelectLanguage} />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Language Switch'), 'b')

    expect(onSelectLanguage).toHaveBeenCalledWith(other)
  })

  it('only shows the confirm/clear buttons when their handlers are provided', async () => {
    const onConfirm = vi.fn()
    const onClear = vi.fn()
    const card = makeCard()
    render(<CardPreview card={card} onConfirm={onConfirm} onClear={onClear} />)

    await userEvent.click(screen.getByRole('button', { name: 'Report an issue with this printing' }))
    await userEvent.click(screen.getByRole('button', { name: 'Look up a different card' }))

    expect(onConfirm).toHaveBeenCalledWith(card)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renders no action buttons when no handlers are given', () => {
    render(<CardPreview card={makeCard()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
