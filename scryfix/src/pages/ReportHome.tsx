import { useState } from 'react'
import CardLookup from '../components/CardLookup'
import DuplicateCheck from '../components/DuplicateCheck'
import type { ScryfallCard } from '../lib/scryfall'
import WizardEngine from '../wizard/WizardEngine'
import { getWizard } from '../wizard/wizards'

function ReportHome() {
  const [card, setCard] = useState<ScryfallCard | null>(null)
  const [wizardId, setWizardId] = useState<string | null>(null)
  // The anti-spam minimum-duration clock starts at card confirmation, not when the wizard mounts,
  // so time spent on the duplicate check counts towards it.
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const wizard = wizardId ? getWizard(wizardId) : undefined

  function reset() {
    setCard(null)
    setWizardId(null)
    setStartedAt(null)
  }

  return (
    <section id="center">
      <h1>Scryfix</h1>
      {card && wizard ? (
        <WizardEngine config={wizard} card={card} onExit={reset} startedAt={startedAt ?? undefined} />
      ) : card ? (
        <DuplicateCheck card={card} onStart={setWizardId} onCancel={reset} />
      ) : (
        <>
          <p>Look up a card to start reporting a data error on Scryfall.</p>
          <CardLookup
            onCardConfirmed={(confirmed) => {
              setStartedAt(Date.now())
              setCard(confirmed)
            }}
          />
        </>
      )}
    </section>
  )
}

export default ReportHome
