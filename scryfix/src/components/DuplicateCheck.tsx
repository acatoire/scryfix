import { useEffect, useState } from 'react'
import { findRelatedReports, type RelatedReport } from '../lib/duplicates'
import { UPSTREAM_REPO, confirmOpenReport, describeGitHubError } from '../lib/github'
import { getGitHubAuth } from '../lib/githubAuth'
import type { ScryfallCard } from '../lib/scryfall'
import { WIZARDS } from '../wizard/wizards'
import GitHubConnect from './GitHubConnect'
import MythicToolCheck from './MythicToolCheck'

interface DuplicateCheckProps {
  card: ScryfallCard
  onStart: (wizardId: string) => void
  onCancel: () => void
}

type Lookup = { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; reports: RelatedReport[] }

// Runs right after card lookup, before a wizard is chosen (doc/project-plan.md §4.3): shows what is
// already known about the card, lets the user "+1" an open report instead of filing a duplicate
// (§4.4), and offers a mythic.tool search.
function DuplicateCheck({ card, onStart, onCancel }: DuplicateCheckProps) {
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })
  const [wizardId, setWizardId] = useState(WIZARDS[0].id)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [signedIn, setSignedIn] = useState(() => Boolean(getGitHubAuth().getToken()))
  const [comment, setComment] = useState('')
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set())
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    findRelatedReports(UPSTREAM_REPO, card.set, card.collector_number)
      .then((reports) => !cancelled && setLookup({ kind: 'done', reports }))
      .catch(() => !cancelled && setLookup({ kind: 'error' }))
    return () => {
      cancelled = true
    }
  }, [card])

  async function sendConfirmation(prNumber: number) {
    setConfirmError(null)
    try {
      await confirmOpenReport(getGitHubAuth(), UPSTREAM_REPO, prNumber, comment)
      setConfirmed((prev) => new Set(prev).add(prNumber))
      setConfirming(null)
      setComment('')
    } catch (err) {
      setConfirmError(describeGitHubError(err).message)
    }
  }

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
              {related.prNumber !== null &&
                (confirmed.has(related.prNumber) ? (
                  <span> — thanks for confirming!</span>
                ) : (
                  <button type="button" onClick={() => setConfirming(related.prNumber)}>
                    👍 Still present
                  </button>
                ))}
              {related.prNumber !== null && confirming === related.prNumber && (
                <div className="duplicate-check-confirm">
                  {signedIn ? (
                    <>
                      <label className="wizard-field">
                        Add a short comment (optional)
                        <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
                      </label>
                      <button type="button" onClick={() => void sendConfirmation(related.prNumber!)}>
                        Send confirmation
                      </button>
                    </>
                  ) : (
                    <GitHubConnect onConnected={() => setSignedIn(true)} />
                  )}
                  {confirmError && <p className="wizard-error">{confirmError}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <MythicToolCheck card={card} />

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
