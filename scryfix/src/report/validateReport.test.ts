import { describe, expect, it } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import { buildReport } from './buildReport'
import { missingImageLanguageWizard } from '../wizard/wizards/missingImageLanguage'
import { validateReport } from './validateReport'
import type { Report } from './types'

const card = makeCard()

function validReport(): Report {
  return buildReport({
    reportId: 'report-1',
    createdAt: '2026-08-07T00:00:00.000Z',
    card,
    wizard: missingImageLanguageWizard,
    answers: { affected_language: 'fr' },
    skipped: {},
  }).report
}

describe('validateReport', () => {
  it('accepts a report built by buildReport()', async () => {
    expect(await validateReport(validReport())).toEqual({ valid: true, errors: [] })
  })

  it('rejects a report missing a required top-level field', async () => {
    const report = validReport()
    // @ts-expect-error deliberately malformed for the test
    delete report.reporter

    const result = await validateReport(report)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/reporter/)
  })

  it('rejects a report with an unknown top-level field (additionalProperties: false)', async () => {
    const result = await validateReport({ ...validReport(), extra_field: 'nope' } as Report)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/must NOT have additional properties/)
  })

  it('rejects a report with the wrong schema_version', async () => {
    const result = await validateReport({ ...validReport(), schema_version: '2.0' } as unknown as Report)
    expect(result.valid).toBe(false)
  })

  it('rejects a fix_files entry that is neither an image nor a url attachment', async () => {
    const report = validReport()
    report.fix_files = [{ type: 'video', path: 'x.mp4' } as never]
    const result = await validateReport(report)
    expect(result.valid).toBe(false)
  })
})
