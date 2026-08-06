import { SCRYFALL_LANGUAGES } from '../../data/scryfallLanguages'
import type { WizardStepDef } from '../types'

interface SelectStepProps {
  step: WizardStepDef & { kind: 'select' }
  value: string | undefined
  onChange: (value: string) => void
}

const OPTIONS_SOURCES = {
  scryfallLanguages: SCRYFALL_LANGUAGES.map((lang) => ({ value: lang.code, label: lang.name })),
}

function SelectStep({ step, value, onChange }: SelectStepProps) {
  const options = OPTIONS_SOURCES[step.optionsSource]

  return (
    <label className="wizard-field">
      {step.label}
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>
          Select…
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default SelectStep
