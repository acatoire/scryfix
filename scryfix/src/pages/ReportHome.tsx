import { useState } from 'react'
import CardLookup from '../components/CardLookup'
import DuplicateCheck from '../components/DuplicateCheck'
import type { ScryfallCard } from '../lib/scryfall'
import WizardEngine from '../wizard/WizardEngine'
import type { WizardAnswers } from '../wizard/types'
import type { BatchEntry, SharedAnswers } from '../wizard/WizardSummary'
import { getWizard } from '../wizard/wizards'

function ReportHome() {
  const [card, setCard] = useState<ScryfallCard | null>(null)
  const [wizardId, setWizardId] = useState<string | null>(null)
  // Multi-card report: earlier cards of the same issue wait here and go out in one PR together
  // with the last card's report (ai/decisions.md).
  const [batch, setBatch] = useState<BatchEntry[]>([])
  const [shared, setShared] = useState<SharedAnswers | null>(null)
  // The anti-spam minimum-duration clock starts at the first card's confirmation (so time spent on
  // the duplicate check counts towards it) and is not reset by later cards of a batch.
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const wizard = wizardId ? getWizard(wizardId) : undefined

  function reset() {
    setCard(null)
    setWizardId(null)
    setBatch([])
    setShared(null)
    setStartedAt(null)
  }

  function handleAddCard(entry: BatchEntry, sharedAnswers: SharedAnswers) {
    setBatch((prev) => [...prev, entry])
    setShared(sharedAnswers)
    setCard(null)
  }

  const initialAnswers: WizardAnswers | undefined = shared
    ? { description: shared.description, external_refs: shared.external_refs }
    : undefined

  return (
    <section id="center">
      <h1>Scryfix</h1>
      {card && wizard ? (
        <WizardEngine
          // A fresh engine per card: answers/step state must not leak from the previous card.
          key={card.id + batch.length}
          config={wizard}
          card={card}
          onExit={reset}
          startedAt={startedAt ?? undefined}
          initialAnswers={initialAnswers}
          batch={batch}
          onAddCard={handleAddCard}
        />
      ) : card ? (
        <DuplicateCheck
          card={card}
          onStart={setWizardId}
          onCancel={batch.length > 0 ? () => setCard(null) : reset}
        />
      ) : (
        <>
          {batch.length > 0 ? (
            <p>
              Multi-card report: {batch.length} card{batch.length > 1 ? 's' : ''} queued. Look up the next
              affected card — its description and links are pre-filled.
            </p>
          ) : (
            <p>Look up a card to start reporting a data error on Scryfall.</p>
          )}
          <CardLookup
            onCardConfirmed={(confirmed) => {
              if (startedAt === null) setStartedAt(Date.now())
              if (batch.length > 0) setWizardId(batch[0].report.error_type)
              setCard(confirmed)
            }}
          />
          {batch.length > 0 && (
            <button type="button" onClick={reset}>
              Discard queued cards
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default ReportHome
