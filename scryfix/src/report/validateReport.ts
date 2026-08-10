import type { Report } from './types'

export interface ReportValidationResult {
  valid: boolean
  errors: string[]
}

// ajv is only needed once someone actually submits (like jszip in downloadReportZip.ts) — a
// top-level import added ~37KB gzip to the main bundle for every visitor, most of whom never submit.
export async function validateReport(report: Report): Promise<ReportValidationResult> {
  const [{ default: Ajv2020 }, { default: schema }] = await Promise.all([
    import('ajv/dist/2020'),
    import('../../schema/report.schema.json'),
  ])
  const ajv = new Ajv2020({ allErrors: true })
  const validate = ajv.compile(schema)

  const valid = validate(report)
  if (valid) return { valid: true, errors: [] }
  const errors = (validate.errors ?? []).map((error) => `${error.instancePath || '(root)'} ${error.message}`)
  return { valid: false, errors }
}
