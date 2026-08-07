import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import CardSearchResults from './CardSearchResults'

describe('CardSearchResults', () => {
  it('renders a row per card with name/set/number/lang', () => {
    const cards = [
      makeCard({ id: 'a', name: 'Lightning Bolt', set: 'lea', collector_number: '162', lang: 'en' }),
      makeCard({ id: 'b', name: 'Lightning Bolt', set: 'm10', collector_number: '146', lang: 'fr' }),
    ]
    render(<CardSearchResults cards={cards} onSelect={() => {}} />)

    expect(screen.getAllByText('Lightning Bolt')).toHaveLength(2)
    expect(screen.getByText(/LEA/)).toBeInTheDocument()
    expect(screen.getByText(/M10/)).toBeInTheDocument()
  })

  it('calls onSelect with the clicked card', async () => {
    const cards = [makeCard({ id: 'a', name: 'Lightning Bolt' }), makeCard({ id: 'b', name: 'Shock' })]
    const onSelect = vi.fn()
    render(<CardSearchResults cards={cards} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: /Shock/ }))

    expect(onSelect).toHaveBeenCalledWith(cards[1])
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when there are no cards', () => {
    render(<CardSearchResults cards={[]} onSelect={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
