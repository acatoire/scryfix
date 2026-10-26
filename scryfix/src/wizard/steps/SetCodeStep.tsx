import { useState } from 'react'
import { findRelatedUnlistedReports, type RelatedReport } from '../../lib/duplicates'
import { UPSTREAM_REPO } from '../../lib/github'
import { getSet } from '../../lib/scryfall'
import type { WizardStepDef } from '../types'

interface SetCodeStepProps {
  step: WizardStepDef & { kind: 'setCode' }
  value: string | undefined
  onChange: (value: string) => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; name: string; related: RelatedReport[] }

// The answer is only ever set once Scryfall confirms the set exists, so the engine's plain
// "non-empty required answer" gate is enough to block Next on an unknown code. Also cross-checks
// existing _unlisted reports for that set (doc/project-plan.md §5.3) so a repeat isn't filed blindly.
function SetCodeStep({ step, value, onChange }: SetCodeStepProps) {
  const [input, setInput] = useState(value ?? '')
  const [status, setStatus] = useState<Status>(
    value ? { kind: 'ok', name: value.toUpperCase(), related: [] } : { kind: 'idle' },
  )

  async function verify() {
    const code = input.trim().toLowerCase()
    if (!code || status.kind === 'checking') return
    setStatus({ kind: 'checking' })
    try {
      const set = await getSet(code)
      const related = await findRelatedUnlistedReports(UPSTREAM_REPO, set.code).catch(() => [])
      setStatus({ kind: 'ok', name: set.name, related })
      onChange(set.code)
    } catch {
      setStatus({ kind: 'error', message: `Scryfall has no set with code "${code}".` })
      onChange('')
    }
  }

  return (
    <div className="wizard-field">
      <label>
        {step.label}
        <input
          type="text"
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            setStatus({ kind: 'idle' })
            onChange('')
          }}
        />
      </label>
      <button type="button" onClick={() => void verify()} disabled={!input.trim() || status.kind === 'checking'}>
        {status.kind === 'checking' ? 'Checking…' : 'Verify set'}
      </button>
      {status.kind === 'error' && <p className="wizard-error">{status.message}</p>}
      {status.kind === 'ok' && (
        <>
          <p className="github-connect-hint">Found set: {status.name}</p>
          {status.related.length > 0 && (
            <div className="wizard-duplicate-warning">
              <p>Existing unlisted reports for this set — check they are not the same printing:</p>
              <ul>
                {status.related.map((related) => (
                  <li key={related.url}>
                    <a href={related.url} target="_blank" rel="noreferrer">
                      {related.title}
                    </a>{' '}
                    ({related.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SetCodeStep
