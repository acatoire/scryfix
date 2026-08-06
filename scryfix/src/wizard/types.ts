// Wizard Engine types — see doc/project-plan.md §5. New wizards are added as a config object
// using these step kinds, without touching the engine or step components.

export type AttachmentValue = { kind: 'file'; file: File; previewUrl: string } | { kind: 'url'; url: string }

export interface Attachment {
  id: string
  value: AttachmentValue
}

export type WizardStepDef =
  | { kind: 'select'; id: string; label: string; optionsSource: 'scryfallLanguages' }
  | { kind: 'textarea'; id: string; label: string; required?: boolean }
  | { kind: 'attachments'; id: string; label: string; required?: boolean; help?: string }
  | { kind: 'urlList'; id: string; label: string }

export interface WizardConfig {
  schemaVersion: '1.0'
  id: string
  title: string
  steps: WizardStepDef[]
}

export type WizardAnswerValue = string | Attachment[] | string[]

export type WizardAnswers = Record<string, WizardAnswerValue>
