import { useEffect, useState } from 'react'
import { findRelatedReports, type RelatedReport } from '../lib/duplicates'
import { UPSTREAM_REPO } from '../lib/github'
import type { ScryfallCard } from '../lib/scryfall'
import { WIZARDS } from '../wizard/wizards'

interface DuplicateCheckProps {
  card: ScryfallCard
  onStart: (wizardId: string) => void
  onCancel: () => void
}

type Lookup = { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; reports: RelatedReport[] }

// Runs right after card lookup, before a wizard is chosen (doc/project-plan.md §4.3): shows what is
// already known about the card so the user can spot a duplicate before filing a new report.
function DuplicateCheck({ card, onStart, onCancel }: DuplicateCheckProps) {
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })
  const [wizardId, setWizardId] = useState(WIZARDS[0].id)

  useEffect(() => {
    let cancelled = false
    findRelatedReports(UPSTREAM_REPO, card.set, card.collector_number)
      .then((reports) => !cancelled && setLookup({ kind: 'done', reports }))
      .catch(() => !cancelled && setLookup({ kind: 'error' }))
    return () => {
      cancelled = true
    }
  }, [card])

  return (
    <div className="duplicate-check">
      <p className="wizard-card-context">
        Reporting on <strong>{card.name}</strong> — {card.set_name} ({card.set.toUpperCase()}) #
        {card.collector_number} · {card.lang}
      </p>

      <h2>Known reports for this card</h2>
      {lookup.kind === 'loading' && <p>Checking existing reports…</p>}
      {lookup.kind === 'error' && (
        <p className="wizard-error">Could not check existing reports — you can still continue.</p>
      )}
      {lookup.kind === 'done' && lookup.reports.length === 0 && <p>No existing reports for this card.</p>}
      {lookup.kind === 'done' && lookup.reports.length > 0 && (
        <ul className="duplicate-check-list">
          {lookup.reports.map((related) => (
            <li key={related.url}>
              <span className={`duplicate-check-status duplicate-check-${related.status}`}>
                {related.status === 'open' ? 'Open PR' : 'Merged'}
              </span>{' '}
              <a href={related.url} target="_blank" rel="noreferrer">
                {related.title}
              </a>
              {related.errorType && <span> ({related.errorType})</span>}
            </li>
          ))}
        </ul>
      )}

      <label className="wizard-field">
        What kind of problem is it?
        <select value={wizardId} onChange={(event) => setWizardId(event.target.value)}>
          {WIZARDS.map((wizard) => (
            <option key={wizard.id} value={wizard.id}>
              {wizard.title}
            </option>
          ))}
        </select>
      </label>

      <div className="wizard-nav">
        <button type="button" onClick={onCancel}>
          Back
        </button>
        <button type="button" onClick={() => onStart(wizardId)}>
          Start report
        </button>
      </div>
    </div>
  )
}

export default DuplicateCheck
