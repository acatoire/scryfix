import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadReportZip } from './downloadReportZip'
import type { Report } from './types'

const report: Report = {
  schema_version: '1.0',
  report_id: 'report-123',
  created_at: '2026-08-07T00:00:00.000Z',
  error_type: 'missing_image_language',
  card: {
    set: 'afc',
    collector_number: '183',
    scryfall_id: 'abc',
    name: 'Cold-Eyed Selkie',
    lang: 'en',
    scryfall_url: 'https://scryfall.com/card/afc/183',
  },
  unlisted: { is_unlisted: false, set_code: null, collector_number_hash: null },
  details: { affected_language: 'fr' },
  description: '',
  evidence: [],
  fix_files: [{ type: 'image', path: 'report-123_fix_1.png', purpose: 'correct_card_image' }],
  external_refs: [],
  reporter: { github_username: null },
  incomplete: false,
  missing: [],
}

describe('downloadReportZip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bundles report.json plus every file, and triggers a named download', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const files = [{ path: 'report-123_fix_1.png', file: new File(['x'], 'fix.png') }]

    await downloadReportZip(report, files)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const [blob] = createObjectURL.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(click).toHaveBeenCalledTimes(1)

    // the <a> that got clicked should have carried the right href/download before click() ran
    const link = click.mock.instances[0] as HTMLAnchorElement
    expect(link.href).toBe('blob:zip')
    expect(link.download).toBe('report-123.zip')

    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:zip'))
  })
})
