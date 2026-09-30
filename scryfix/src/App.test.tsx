import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeCard } from './test-utils/scryfallFixtures'
import type { ScryfallCard } from './lib/scryfall'
import type { WizardConfig } from './wizard/types'

const card = makeCard()

vi.mock('./components/CardLookup', () => ({
  default: ({ onCardConfirmed }: { onCardConfirmed: (card: ScryfallCard) => void }) => (
    <button type="button" onClick={() => onCardConfirmed(card)}>
      stub-confirm-card
    </button>
  ),
}))

vi.mock('./components/DuplicateCheck', () => ({
  default: ({ onStart, onCancel }: { onStart: (id: string) => void; onCancel: () => void }) => (
    <div>
      <button type="button" onClick={() => onStart('other')}>
        stub-start-wizard
      </button>
      <button type="button" onClick={onCancel}>
        stub-cancel-check
      </button>
    </div>
  ),
}))

vi.mock('./wizard/WizardEngine', () => ({
  default: ({
    config,
    card,
    onExit,
    startedAt,
  }: {
    config: WizardConfig
    card: ScryfallCard
    onExit: () => void
    startedAt?: number
  }) => (
    <div>
      <p>stub-wizard-for-{card.name}</p>
      <p>stub-wizard-config-{config.id}</p>
      <p>stub-started-at-{typeof startedAt}</p>
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

  it('goes card lookup → duplicate check → chosen wizard, and back on exit', async () => {
    render(<App />)

    await userEvent.click(screen.getByText('stub-confirm-card'))
    await userEvent.click(screen.getByText('stub-start-wizard'))
    expect(screen.getByText(`stub-wizard-for-${card.name}`)).toBeInTheDocument()
    expect(screen.getByText('stub-wizard-config-other')).toBeInTheDocument()
    // The anti-spam clock started at card confirmation, before the duplicate check.
    expect(screen.getByText('stub-started-at-number')).toBeInTheDocument()
    expect(screen.queryByText('stub-confirm-card')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('stub-exit'))
    expect(screen.getByText('stub-confirm-card')).toBeInTheDocument()
  })

  it('goes back to card lookup when the duplicate check is cancelled', async () => {
    render(<App />)

    await userEvent.click(screen.getByText('stub-confirm-card'))
    await userEvent.click(screen.getByText('stub-cancel-check'))

    expect(screen.getByText('stub-confirm-card')).toBeInTheDocument()
  })
})
