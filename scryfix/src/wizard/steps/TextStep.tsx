import type { WizardStepDef } from '../types'

interface TextStepProps {
  step: WizardStepDef & { kind: 'text' }
  value: string | undefined
  onChange: (value: string) => void
}

function TextStep({ step, value, onChange }: TextStepProps) {
  return (
    <label className="wizard-field">
      {step.label}
      <input
        type="text"
        placeholder={step.placeholder}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default TextStep
