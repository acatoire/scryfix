import { describe, expect, it } from 'vitest'
import {
  MIN_SUBMISSION_INTERVAL_MS,
  MIN_WIZARD_DURATION_MS,
  checkSubmissionDelay,
  checkWizardDuration,
  formatWait,
  submissionTooSoonMessage,
  wizardTooFastMessage,
} from './antiSpam'

describe('checkWizardDuration', () => {
  it('blocks when under the minimum and reports the remaining time', () => {
    const result = checkWizardDuration(1000, 1000 + 20_000)
    expect(result).toEqual({ ok: false, remainingMs: MIN_WIZARD_DURATION_MS - 20_000 })
  })

  it('passes once the minimum has elapsed', () => {
    expect(checkWizardDuration(0, MIN_WIZARD_DURATION_MS).ok).toBe(true)
  })
})

describe('checkSubmissionDelay', () => {
  it('passes with no previous PR', () => {
    expect(checkSubmissionDelay(null).ok).toBe(true)
  })

  it('blocks a PR right after the last one', () => {
    const now = Date.parse('2026-01-01T00:10:00Z')
    const result = checkSubmissionDelay('2026-01-01T00:08:00Z', now)
    expect(result.ok).toBe(false)
    expect(result.remainingMs).toBe(MIN_SUBMISSION_INTERVAL_MS - 2 * 60_000)
  })

  it('passes once the interval has elapsed', () => {
    const now = Date.parse('2026-01-01T00:10:00Z')
    expect(checkSubmissionDelay('2026-01-01T00:00:00Z', now).ok).toBe(true)
  })
})

describe('messages', () => {
  it('formats seconds and minutes', () => {
    expect(formatWait(12_400)).toBe('13s')
    expect(formatWait(61_000)).toBe('2m')
  })

  it('builds friendly messages', () => {
    expect(wizardTooFastMessage(30_000)).toContain('30s')
    expect(submissionTooSoonMessage(120_000)).toContain('2m')
  })
})
