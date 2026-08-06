import { describe, expect, it } from 'vitest'
import type { Attachment, WizardStepDef } from './types'
import { isStepAnswered } from './validation'

const fileAttachment: Attachment = {
  id: '1',
  value: { kind: 'url', url: 'https://example.com/a.png' },
}

describe('isStepAnswered', () => {
  it('select is answered only with a non-empty value', () => {
    const step: WizardStepDef = {
      kind: 'select',
      id: 'lang',
      label: 'Language',
      optionsSource: 'scryfallLanguages',
    }
    expect(isStepAnswered(step, undefined)).toBe(false)
    expect(isStepAnswered(step, '')).toBe(false)
    expect(isStepAnswered(step, 'en')).toBe(true)
  })

  it('textarea is only gated when required', () => {
    const optional: WizardStepDef = { kind: 'textarea', id: 'description', label: 'Description' }
    expect(isStepAnswered(optional, undefined)).toBe(true)
    expect(isStepAnswered(optional, '')).toBe(true)

    const required: WizardStepDef = {
      kind: 'textarea',
      id: 'description',
      label: 'Description',
      required: true,
    }
    expect(isStepAnswered(required, undefined)).toBe(false)
    expect(isStepAnswered(required, '   ')).toBe(false)
    expect(isStepAnswered(required, 'it is upside down')).toBe(true)
  })

  it('attachments is only gated when required', () => {
    const optional: WizardStepDef = { kind: 'attachments', id: 'evidence', label: 'Evidence' }
    expect(isStepAnswered(optional, undefined)).toBe(true)
    expect(isStepAnswered(optional, [])).toBe(true)

    const required: WizardStepDef = {
      kind: 'attachments',
      id: 'fix_files',
      label: 'Fix files',
      required: true,
    }
    expect(isStepAnswered(required, undefined)).toBe(false)
    expect(isStepAnswered(required, [])).toBe(false)
    expect(isStepAnswered(required, [fileAttachment])).toBe(true)
  })

  it('urlList is always answered (never required)', () => {
    const step: WizardStepDef = { kind: 'urlList', id: 'external_refs', label: 'External refs' }
    expect(isStepAnswered(step, undefined)).toBe(true)
    expect(isStepAnswered(step, [])).toBe(true)
    expect(isStepAnswered(step, ['https://example.com'])).toBe(true)
  })
})
