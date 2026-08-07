import type { WizardStepDef } from '../types'

interface TextareaStepProps {
  step: WizardStepDef & { kind: 'textarea' }
  value: string | undefined
  onChange: (value: string) => void
}

function TextareaStep({ step, value, onChange }: TextareaStepProps) {
  return (
    <label className="wizard-field">
      {step.label}
      <textarea rows={5} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default TextareaStep
