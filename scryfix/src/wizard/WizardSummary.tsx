import { useMemo, useState } from 'react'
import GitHubConnect from '../components/GitHubConnect'
import { SCRYFALL_LANGUAGES } from '../data/scryfallLanguages'
import { getGitHubAuth } from '../lib/githubAuth'
import {
  checkSubmissionDelay,
  checkWizardDuration,
  submissionTooSoonMessage,
  wizardTooFastMessage,
} from '../lib/antiSpam'
import { UPSTREAM_REPO, describeGitHubError, submitReports } from '../lib/github'
import { getLastPullRequestDate } from '../lib/githubRead'
import type { ScryfallCard } from '../lib/scryfall'
import { buildReport } from '../report/buildReport'
import { downloadReportZip } from '../report/downloadReportZip'
import { validateReport } from '../report/validateReport'
import ImageLightbox from './ImageLightbox'
import type { Report } from '../report/types'
import type { Attachment, WizardAnswers, WizardConfig } from './types'

export interface BatchEntry {
  report: Report
  files: { path: string; file: File }[]
}

// Answers carried over to the next card of a multi-card report (one shared description/links).
export interface SharedAnswers {
  description: string
  external_refs: string[]
}

interface WizardSummaryProps {
  config: WizardConfig
  card: ScryfallCard
  answers: WizardAnswers
  skipped: Record<string, boolean>
  onExit: () => void
  // Anti-spam (doc/project-plan.md §4.2): the wizard must have been open for a minimum time.
  startedAt?: number
  // Reports already queued for the same PR (multi-card report), submitted together with this one.
  batch?: BatchEntry[]
  onAddCard?: (entry: BatchEntry, shared: SharedAnswers) => void
}

function attachmentUrl(attachment: Attachment): string {
  return attachment.value.kind === 'file' ? attachment.value.previewUrl : attachment.value.url
}

function attachmentLabel(attachment: Attachment): string {
  return attachment.value.kind === 'file' ? attachment.value.file.name : attachment.value.url
}

function formatValue(step: WizardConfig['steps'][number], value: WizardAnswers[string] | undefined) {
  if (step.kind === 'select') {
    const lang = SCRYFALL_LANGUAGES.find((l) => l.code === value)
    return lang ? `${lang.name} (${lang.code})` : '—'
  }
  if (step.kind === 'textarea' || step.kind === 'text' || step.kind === 'setCode') {
    return typeof value === 'string' && value.trim() ? value : '—'
  }
  const urls = (value as string[] | undefined) ?? []
  return urls.length > 0 ? urls.join(', ') : '—'
}

function WizardSummary({
  config,
  card,
  answers,
  skipped,
  onExit,
  startedAt = 0,
  batch = [],
  onAddCard,
}: WizardSummaryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [githubUsername, setGithubUsername] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorDetail, setSubmitErrorDetail] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const missingSteps = config.steps.filter((step) => skipped[step.id])
  const isIncomplete = missingSteps.length > 0

  const [reportId] = useState(() => crypto.randomUUID())
  const [createdAt] = useState(() => new Date().toISOString())
  const { report, files } = useMemo(
    () => buildReport({ reportId, createdAt, card, wizard: config, answers, skipped }),
    [reportId, createdAt, card, config, answers, skipped],
  )

  async function handleDownload() {
    setDownloadError(null)
    try {
      await downloadReportZip(report, files)
    } catch {
      setDownloadError('Could not build the download. Please try again.')
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    setSubmitErrorDetail(null)
    const tooFast = checkWizardDuration(startedAt)
    if (!tooFast.ok) {
      setSubmitError(wizardTooFastMessage(tooFast.remainingMs))
      setSubmitting(false)
      return
    }
    try {
      const lastPr = githubUsername ? await getLastPullRequestDate(UPSTREAM_REPO, githubUsername) : null
      const tooSoon = checkSubmissionDelay(lastPr)
      if (!tooSoon.ok) {
        setSubmitError(submissionTooSoonMessage(tooSoon.remainingMs))
        setSubmitting(false)
        return
      }
    } catch {
      // Search API unavailable/rate-limited: the gate is a soft, client-side check anyway — don't
      // block a legitimate submission on a failed lookup.
    }
    const entries: BatchEntry[] = [...batch, { report, files }].map((entry) => ({
      ...entry,
      report: { ...entry.report, reporter: { github_username: githubUsername } },
    }))
    for (const entry of entries) {
      const validation = await validateReport(entry.report)
      if (!validation.valid) {
        setSubmitError('This report failed schema validation — that is a bug, not something you can fix here.')
        setSubmitErrorDetail(validation.errors.join('\n'))
        setSubmitting(false)
        return
      }
    }
    try {
      const result = await submitReports({
        auth: getGitHubAuth(),
        upstream: UPSTREAM_REPO,
        reports: entries,
      })
      setPrUrl(result.prUrl)
    } catch (err) {
      const info = describeGitHubError(err)
      setSubmitError(info.message)
      setSubmitErrorDetail(info.detail)
    } finally {
      setSubmitting(false)
    }
  }

  function handleAddCard() {
    onAddCard?.(
      { report, files },
      {
        description: report.description,
        external_refs: (answers.external_refs as string[] | undefined) ?? [],
      },
    )
  }

  return (
    <div className="wizard wizard-summary">
      <p className="wizard-card-context">
        Reporting on <strong>{card.name}</strong> — {card.set_name} ({card.set.toUpperCase()}) #
        {card.collector_number} · {card.lang}
      </p>
      <h2>Review: {config.title}</h2>

      {batch.length > 0 && (
        <p className="github-connect-hint">
          Multi-card report: {batch.length} other card{batch.length > 1 ? 's' : ''} queued (
          {batch.map((entry) => entry.report.card.name).join(', ')}) — all submitted together in one pull
          request.
        </p>
      )}

      {isIncomplete && (
        <p className="wizard-incomplete-banner">
          Incomplete report — missing {missingSteps.map((step) => step.label.toLowerCase()).join(', ')}.
          It can still be submitted; the community will be able to complete it later.
        </p>
      )}

      <p>
        Report <code>{report.report_id}</code> — submit it as a GitHub pull request, or download it
        as a zip (report.json + any uploaded images) to file it yourself:
      </p>
      <dl>
        {config.steps.map((step) => {
          const value = answers[step.id]
          const attachments = step.kind === 'attachments' ? ((value as Attachment[] | undefined) ?? []) : null

          return (
            <div key={step.id} className="wizard-summary-row">
              <dt>{step.label}</dt>
              <dd>
                {attachments ? (
                  attachments.length > 0 ? (
                    <div className="wizard-summary-thumbs">
                      {attachments.map((attachment) => (
                        <button
                          key={attachment.id}
                          type="button"
                          className="wizard-summary-thumb"
                          title={attachmentLabel(attachment)}
                          onClick={() => setLightboxUrl(attachmentUrl(attachment))}
                        >
                          <img src={attachmentUrl(attachment)} alt={attachmentLabel(attachment)} />
                        </button>
                      ))}
                    </div>
                  ) : skipped[step.id] ? (
                    <span className="wizard-incomplete-tag">Not provided — marked incomplete</span>
                  ) : (
                    '—'
                  )
                ) : (
                  formatValue(step, value)
                )}
              </dd>
            </div>
          )
        })}
      </dl>

      <details className="wizard-summary-json">
        <summary>View report.json</summary>
        <pre>{JSON.stringify(report, null, 2)}</pre>
      </details>

      {downloadError && <p className="wizard-error">{downloadError}</p>}

      {prUrl ? (
        <p className="wizard-pr-success">
          Submitted! <a href={prUrl} target="_blank" rel="noreferrer">View the pull request</a>.
        </p>
      ) : githubUsername ? (
        <p className="github-connect-hint">Connected as {githubUsername}.</p>
      ) : (
        <GitHubConnect onConnected={setGithubUsername} />
      )}

      {submitError && (
        <div className="wizard-error">
          <p>{submitError}</p>
          <details className="wizard-summary-json">
            <summary>Error details</summary>
            <pre>{submitErrorDetail}</pre>
          </details>
        </div>
      )}

      <div className="wizard-nav">
        <button type="button" onClick={onExit}>
          Start a new report
        </button>
        {onAddCard && !prUrl && (
          <button type="button" onClick={handleAddCard}>
            Add another card to this report
          </button>
        )}
        <button type="button" className="wizard-download" onClick={() => void handleDownload()}>
          Download report (.zip)
        </button>
        {githubUsername && !prUrl && (
          <button
            type="button"
            className="wizard-submit"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Submitting…' : 'Submit as GitHub PR'}
          </button>
        )}
      </div>

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

export default WizardSummary
