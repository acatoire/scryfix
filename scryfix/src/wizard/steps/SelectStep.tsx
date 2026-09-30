import { SCRYFALL_LANGUAGES } from '../../data/scryfallLanguages'
import type { WizardStepDef } from '../types'

interface SelectStepProps {
  step: WizardStepDef & { kind: 'select' }
  value: string | undefined
  onChange: (value: string) => void
}

const LANGUAGE_OPTIONS = SCRYFALL_LANGUAGES.map((lang) => ({ value: lang.code, label: lang.name }))

function optionsFor(step: SelectStepProps['step']): { value: string; label: string }[] {
  if (step.options) return step.options.map((option) => ({ value: option, label: option }))
  return LANGUAGE_OPTIONS
}

function SelectStep({ step, value, onChange }: SelectStepProps) {
  const options = optionsFor(step)

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
