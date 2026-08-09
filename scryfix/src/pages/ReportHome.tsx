import { useState } from 'react'
import CardLookup from '../components/CardLookup'
import type { ScryfallCard } from '../lib/scryfall'
import WizardEngine from '../wizard/WizardEngine'
import { missingImageLanguageWizard } from '../wizard/wizards/missingImageLanguage'

function ReportHome() {
  const [reportingCard, setReportingCard] = useState<ScryfallCard | null>(null)

  return (
    <section id="center">
      <h1>Scryfix</h1>
      {reportingCard ? (
        <WizardEngine
          config={missingImageLanguageWizard}
          card={reportingCard}
          onExit={() => setReportingCard(null)}
        />
      ) : (
        <>
          <p>Look up a card to start reporting a data error on Scryfall.</p>
          <CardLookup onCardConfirmed={setReportingCard} />
        </>
      )}
    </section>
  )
}

export default ReportHome
