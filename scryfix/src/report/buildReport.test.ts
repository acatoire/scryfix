import { describe, expect, it } from 'vitest'
import type { ScryfallCard } from '../lib/scryfall'
import type { Attachment } from '../wizard/types'
import { missingImageLanguageWizard } from '../wizard/wizards/missingImageLanguage'
import { buildReport } from './buildReport'

const card: ScryfallCard = {
  id: 'abc-123',
  name: 'Cold-Eyed Selkie',
  lang: 'en',
  set: 'afc',
  set_name: 'Foundations Commander',
  collector_number: '183',
  released_at: '2024-01-01',
  layout: 'normal',
  scryfall_uri: 'https://scryfall.com/card/afc/183/cold-eyed-selkie',
  prints_search_uri: 'https://api.scryfall.com/cards/search?q=x',
}

function fileAttachment(id: string, name: string, type = 'image/png'): Attachment {
  return { id, value: { kind: 'file', file: new File(['data'], name, { type }), previewUrl: `blob:${id}` } }
}

function urlAttachment(id: string, url: string): Attachment {
  return { id, value: { kind: 'url', url } }
}

const baseInput = {
  reportId: 'report-1',
  createdAt: '2026-08-07T00:00:00.000Z',
  card,
  wizard: missingImageLanguageWizard,
  skipped: {},
}

describe('buildReport', () => {
  it('maps card fields, error_type, and reporter per the v1.0 schema', () => {
    const { report } = buildReport({ ...baseInput, answers: {} })

    expect(report.schema_version).toBe('1.0')
    expect(report.report_id).toBe('report-1')
    expect(report.created_at).toBe('2026-08-07T00:00:00.000Z')
    expect(report.error_type).toBe('missing_image_language')
    expect(report.card).toEqual({
      set: 'afc',
      collector_number: '183',
      scryfall_id: 'abc-123',
      name: 'Cold-Eyed Selkie',
      lang: 'en',
      scryfall_url: 'https://scryfall.com/card/afc/183/cold-eyed-selkie',
    })
    expect(report.unlisted).toEqual({ is_unlisted: false, set_code: null, collector_number_hash: null })
    expect(report.reporter).toEqual({ github_username: null })
  })

  it('puts the language select answer into details, not a fixed field', () => {
    const { report } = buildReport({ ...baseInput, answers: { affected_language: 'fr' } })
    expect(report.details).toEqual({ affected_language: 'fr' })
  })

  it('assigns fix_files paths as {report_id}_fix_{n}.{ext} and collects the files to zip', () => {
    const attachments = [fileAttachment('a1', 'scan.jpg', 'image/jpeg'), urlAttachment('a2', 'https://example.com/x.png')]
    const { report, files } = buildReport({ ...baseInput, answers: { fix_files: attachments } })

    expect(report.fix_files).toEqual([
      { type: 'image', path: 'report-1_fix_1.jpg', purpose: 'correct_card_image' },
      { type: 'url', value: 'https://example.com/x.png' },
    ])
    expect(files).toEqual([{ path: 'report-1_fix_1.jpg', file: attachments[0].value.kind === 'file' ? attachments[0].value.file : undefined }])
  })

  it('assigns evidence paths without a purpose field', () => {
    const attachments = [fileAttachment('e1', 'proof.png')]
    const { report } = buildReport({ ...baseInput, answers: { evidence: attachments } })
    expect(report.evidence).toEqual([{ type: 'image', path: 'report-1_evidence_1.png' }])
  })

  it('falls back to .png for a file with no extension and an unrecognized mime type', () => {
    const attachments = [fileAttachment('f1', 'noext', 'application/octet-stream')]
    const { report } = buildReport({ ...baseInput, answers: { fix_files: attachments } })
    expect(report.fix_files[0]).toMatchObject({ path: 'report-1_fix_1.png' })
  })

  it('derives external_refs source from the url hostname', () => {
    const { report } = buildReport({
      ...baseInput,
      answers: { external_refs: ['https://gatherer.wizards.com/card/123', 'not a url'] },
    })
    expect(report.external_refs).toEqual([
      { source: 'gatherer.wizards.com', url: 'https://gatherer.wizards.com/card/123' },
      { source: 'not a url', url: 'not a url' },
    ])
  })

  it('trims the description and defaults to empty string when absent', () => {
    expect(buildReport({ ...baseInput, answers: { description: '  hello  ' } }).report.description).toBe('hello')
    expect(buildReport({ ...baseInput, answers: {} }).report.description).toBe('')
  })

  it('flags incomplete and lists missing step ids when a required step was skipped', () => {
    const { report } = buildReport({
      ...baseInput,
      answers: {},
      skipped: { fix_files: true },
    })
    expect(report.incomplete).toBe(true)
    expect(report.missing).toEqual(['fix_files'])
  })

  it('is not incomplete when nothing was skipped', () => {
    const { report } = buildReport({ ...baseInput, answers: {} })
    expect(report.incomplete).toBe(false)
    expect(report.missing).toEqual([])
  })
})
