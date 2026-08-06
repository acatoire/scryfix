import type { Attachment, WizardAnswerValue, WizardStepDef } from './types'

export function isStepAnswered(step: WizardStepDef, value: WizardAnswerValue | undefined): boolean {
  switch (step.kind) {
    case 'select':
      return typeof value === 'string' && value.trim().length > 0
    case 'textarea':
      return !step.required || (typeof value === 'string' && value.trim().length > 0)
    case 'attachments':
      return !step.required || (Array.isArray(value) && (value as Attachment[]).length > 0)
    case 'urlList':
      return true
  }
}
