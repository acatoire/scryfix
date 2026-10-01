import { describe, expect, it } from 'vitest'
import { WIZARDS, getWizard } from './index'

describe('wizard registry', () => {
  it('has unique ids', () => {
    const ids = WIZARDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('registers every planned wizard', () => {
    expect(WIZARDS.map((w) => w.id)).toEqual([
      'missing_image_language',
      'wrong_image_language',
      'unlisted_printing',
      'other',
    ])
  })

  it('looks a wizard up by id', () => {
    expect(getWizard('other')?.title).toBe('Other data error')
    expect(getWizard('nope')).toBeUndefined()
  })

  it('requires fix files for image wizards and a description for other', () => {
    for (const id of ['missing_image_language', 'wrong_image_language', 'unlisted_printing']) {
      const fix = getWizard(id)!.steps.find((s) => s.id === 'fix_files')
      expect(fix).toMatchObject({ kind: 'attachments', required: true })
    }
    expect(getWizard('other')!.steps.find((s) => s.id === 'description')).toMatchObject({ required: true })
  })
})
