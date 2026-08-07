import type { Attachment, WizardAnswerValue, WizardStepDef } from './types'

// `skippedAsIncomplete` lets a user move past a required attachments step (e.g. "fix_files") without
// providing one, marking the report incomplete for the community to fill in later — only meaningful
// for required attachments steps, ignored otherwise.
export function isStepAnswered(
  step: WizardStepDef,
  value: WizardAnswerValue | undefined,
  skippedAsIncomplete = false,
): boolean {
  switch (step.kind) {
    case 'select':
      return typeof value === 'string' && value.trim().length > 0
    case 'textarea':
      return !step.required || (typeof value === 'string' && value.trim().length > 0)
    case 'attachments':
      return (
        !step.required ||
        skippedAsIncomplete ||
        (Array.isArray(value) && (value as Attachment[]).length > 0)
      )
    case 'urlList':
      return true
  }
}

export function canSkipAsIncomplete(step: WizardStepDef): boolean {
  return step.kind === 'attachments' && Boolean(step.required)
}
