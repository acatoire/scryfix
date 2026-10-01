import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeCard } from './test-utils/scryfallFixtures'
import type { ScryfallCard } from './lib/scryfall'
import type { Report } from './report/types'
import type { WizardAnswers, WizardConfig } from './wizard/types'
import type { BatchEntry, SharedAnswers } from './wizard/WizardSummary'

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
    initialAnswers,
    batch = [],
    onAddCard,
  }: {
    config: WizardConfig
    card: ScryfallCard
    onExit: () => void
    startedAt?: number
    initialAnswers?: WizardAnswers
    batch?: BatchEntry[]
    onAddCard?: (entry: BatchEntry, shared: SharedAnswers) => void
  }) => (
    <div>
      <p>stub-wizard-for-{card.name}</p>
      <p>stub-wizard-config-{config.id}</p>
      <p>stub-started-at-{typeof startedAt}</p>
      <p>stub-started-at-value-{startedAt}</p>
      <p>stub-batch-{batch.length}</p>
      <p>stub-initial-description-{String(initialAnswers?.description ?? 'none')}</p>
      <button type="button" onClick={onExit}>
        stub-exit
      </button>
      <button
        type="button"
        onClick={() =>
          onAddCard?.(
            { report: { error_type: config.id, card: { name: card.name } } as Report, files: [] },
            { description: 'shared issue', external_refs: ['https://example.com/a'] },
          )
        }
      >
        stub-add-card
      </button>
    </div>
  ),
}))

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
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

  it('queues cards of a multi-card report, keeps the clock and wizard, and can discard the batch', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    render(<App />)

    await userEvent.click(screen.getByText('stub-confirm-card'))
    await userEvent.click(screen.getByText('stub-start-wizard'))
    expect(screen.getByText('stub-batch-0')).toBeInTheDocument()
    expect(screen.getByText('stub-initial-description-none')).toBeInTheDocument()

    await userEvent.click(screen.getByText('stub-add-card'))
    expect(screen.getByText(/Multi-card report: 1 card queued/)).toBeInTheDocument()

    // Later cards skip the wizard chooser (same wizard as the first card) and don't reset the clock.
    now.mockReturnValue(5000)
    await userEvent.click(screen.getByText('stub-confirm-card'))
    expect(screen.queryByText('stub-start-wizard')).not.toBeInTheDocument()
    expect(screen.getByText('stub-wizard-config-other')).toBeInTheDocument()
    expect(screen.getByText('stub-batch-1')).toBeInTheDocument()
    expect(screen.getByText('stub-started-at-value-1000')).toBeInTheDocument()
    expect(screen.getByText('stub-initial-description-shared issue')).toBeInTheDocument()

    await userEvent.click(screen.getByText('stub-add-card'))
    expect(screen.getByText(/Multi-card report: 2 cards queued/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Discard queued cards' }))
    expect(screen.getByText('Look up a card to start reporting a data error on Scryfall.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard queued cards' })).not.toBeInTheDocument()

    // After a discard, the next card starts a fresh report: duplicate check again, new clock.
    await userEvent.click(screen.getByText('stub-confirm-card'))
    expect(screen.getByText('stub-start-wizard')).toBeInTheDocument()
    await userEvent.click(screen.getByText('stub-start-wizard'))
    expect(screen.getByText('stub-batch-0')).toBeInTheDocument()
    expect(screen.getByText('stub-started-at-value-5000')).toBeInTheDocument()
  })
})
