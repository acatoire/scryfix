// Client-side anti-spam gates (doc/project-plan.md §4.2). Soft gates only — there is no backend to
// enforce them server-side, they raise the bar for naive spam, nothing more.

export const MIN_WIZARD_DURATION_MS = 60_000
// Tunable: plan suggests 5–10 minutes between two PRs from the same account.
export const MIN_SUBMISSION_INTERVAL_MS = 5 * 60_000

export interface GateResult {
  ok: boolean
  remainingMs: number
}

export function checkWizardDuration(startedAt: number, now: number = Date.now()): GateResult {
  const remainingMs = Math.max(0, MIN_WIZARD_DURATION_MS - (now - startedAt))
  return { ok: remainingMs === 0, remainingMs }
}

export function checkSubmissionDelay(lastPrCreatedAt: string | null, now: number = Date.now()): GateResult {
  if (!lastPrCreatedAt) return { ok: true, remainingMs: 0 }
  const remainingMs = Math.max(0, Date.parse(lastPrCreatedAt) + MIN_SUBMISSION_INTERVAL_MS - now)
  return { ok: remainingMs === 0, remainingMs }
}

export function formatWait(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.ceil(seconds / 60)}m`
}

export function wizardTooFastMessage(remainingMs: number): string {
  return `That was quick! Please take a moment to double-check your answers — you can submit in ${formatWait(remainingMs)}.`
}

export function submissionTooSoonMessage(remainingMs: number): string {
  return `You've just submitted a report — please wait ${formatWait(remainingMs)} before sending another.`
}
