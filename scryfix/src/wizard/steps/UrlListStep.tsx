import { useState } from 'react'
import type { WizardStepDef } from '../types'

interface UrlListStepProps {
  step: WizardStepDef & { kind: 'urlList' }
  value: string[] | undefined
  onChange: (value: string[]) => void
}

function UrlListStep({ step, value = [], onChange }: UrlListStepProps) {
  const [draft, setDraft] = useState('')

  function addUrl() {
    const url = draft.trim()
    if (!url) return
    onChange([...value, url])
    setDraft('')
  }

  return (
    <div className="wizard-field">
      <span>{step.label}</span>
      {value.length > 0 && (
        <ul className="wizard-url-list">
          {value.map((url, index) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
              <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="wizard-url-add">
        <input
          type="url"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://…"
        />
        <button type="button" onClick={addUrl}>
          Add link
        </button>
      </div>
    </div>
  )
}

export default UrlListStep
