import type { ScryfallCard } from '../lib/scryfall'
import type { Attachment, WizardAnswers, WizardConfig } from '../wizard/types'
import type { Report, ReportAttachmentItem } from './types'

// Steps whose ids map onto fixed report fields (doc/project-plan.md §5.1/§6) rather than the
// wizard-specific `details` bag.
const WELL_KNOWN_STEP_IDS = new Set(['fix_files', 'evidence', 'external_refs', 'description'])

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}

function extensionFor(file: File): string {
  const match = /\.[a-z0-9]+$/i.exec(file.name)
  return match ? match[0] : MIME_EXTENSIONS[file.type] ?? '.png'
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

interface AttachmentsResult {
  items: ReportAttachmentItem[]
  files: { path: string; file: File }[]
}

function buildAttachments(
  attachments: Attachment[] | undefined,
  reportId: string,
  prefix: string,
  purpose?: string,
): AttachmentsResult {
  const files: { path: string; file: File }[] = []
  const items = (attachments ?? []).map((attachment, index): ReportAttachmentItem => {
    if (attachment.value.kind === 'url') {
      return { type: 'url', value: attachment.value.url }
    }
    const path = `${reportId}_${prefix}_${index + 1}${extensionFor(attachment.value.file)}`
    files.push({ path, file: attachment.value.file })
    return purpose ? { type: 'image', path, purpose } : { type: 'image', path }
  })
  return { items, files }
}

export interface BuildReportInput {
  reportId: string
  createdAt: string
  card: ScryfallCard
  wizard: WizardConfig
  answers: WizardAnswers
  skipped: Record<string, boolean>
}

export interface BuildReportResult {
  report: Report
  files: { path: string; file: File }[]
}

export function buildReport({
  reportId,
  createdAt,
  card,
  wizard,
  answers,
  skipped,
}: BuildReportInput): BuildReportResult {
  const fixFiles = buildAttachments(
    answers.fix_files as Attachment[] | undefined,
    reportId,
    'fix',
    'correct_card_image',
  )
  const evidence = buildAttachments(answers.evidence as Attachment[] | undefined, reportId, 'evidence')

  const externalRefs = ((answers.external_refs as string[] | undefined) ?? []).map((url) => ({
    source: hostnameOf(url),
    url,
  }))

  const details: Record<string, unknown> = {}
  for (const step of wizard.steps) {
    if (WELL_KNOWN_STEP_IDS.has(step.id)) continue
    // Only select/textarea produce plain serializable values; attachments/urlList steps outside
    // the well-known ids don't exist in any current wizard, so there's nothing to map yet.
    if (step.kind === 'select' || step.kind === 'textarea') {
      details[step.id] = answers[step.id] ?? null
    }
  }

  const missing = wizard.steps.filter((step) => skipped[step.id]).map((step) => step.id)

  const report: Report = {
    schema_version: '1.0',
    report_id: reportId,
    created_at: createdAt,
    error_type: wizard.id,
    card: {
      set: card.set,
      collector_number: card.collector_number,
      scryfall_id: card.id,
      name: card.name,
      lang: card.lang,
      scryfall_url: card.scryfall_uri,
    },
    unlisted: {
      is_unlisted: false,
      set_code: null,
      collector_number_hash: null,
    },
    details,
    description: ((answers.description as string | undefined) ?? '').trim(),
    evidence: evidence.items,
    fix_files: fixFiles.items,
    external_refs: externalRefs,
    reporter: { github_username: null },
    incomplete: missing.length > 0,
    missing,
  }

  return { report, files: [...fixFiles.files, ...evidence.files] }
}
