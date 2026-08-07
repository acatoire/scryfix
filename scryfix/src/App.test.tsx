import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeCard } from './test-utils/scryfallFixtures'
import type { ScryfallCard } from './lib/scryfall'

const card = makeCard()

vi.mock('./components/CardLookup', () => ({
  default: ({ onCardConfirmed }: { onCardConfirmed: (card: ScryfallCard) => void }) => (
    <button type="button" onClick={() => onCardConfirmed(card)}>
      stub-confirm-card
    </button>
  ),
}))

vi.mock('./wizard/WizardEngine', () => ({
  default: ({ card, onExit }: { card: ScryfallCard; onExit: () => void }) => (
    <div>
      <p>stub-wizard-for-{card.name}</p>
      <button type="button" onClick={onExit}>
        stub-exit
      </button>
    </div>
  ),
}))

describe('App', () => {
  it('shows card lookup by default', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Scryfix' })).toBeInTheDocument()
    expect(screen.getByText('stub-confirm-card')).toBeInTheDocument()
  })

  it('switches to the wizard once a card is confirmed, and back on exit', async () => {
    render(<App />)

    await userEvent.click(screen.getByText('stub-confirm-card'))
    expect(screen.getByText(`stub-wizard-for-${card.name}`)).toBeInTheDocument()
    expect(screen.queryByText('stub-confirm-card')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('stub-exit'))
    expect(screen.getByText('stub-confirm-card')).toBeInTheDocument()
  })
})
