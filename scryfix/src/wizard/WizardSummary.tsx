import { useState } from 'react'
import { SCRYFALL_LANGUAGES } from '../data/scryfallLanguages'
import type { ScryfallCard } from '../lib/scryfall'
import ImageLightbox from './ImageLightbox'
import type { Attachment, WizardAnswers, WizardConfig } from './types'

interface WizardSummaryProps {
  config: WizardConfig
  card: ScryfallCard
  answers: WizardAnswers
  skipped: Record<string, boolean>
  onExit: () => void
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
  if (step.kind === 'textarea') {
    return typeof value === 'string' && value.trim() ? value : '—'
  }
  const urls = (value as string[] | undefined) ?? []
  return urls.length > 0 ? urls.join(', ') : '—'
}

function WizardSummary({ config, card, answers, skipped, onExit }: WizardSummaryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const missingSteps = config.steps.filter((step) => skipped[step.id])
  const isIncomplete = missingSteps.length > 0

  return (
    <div className="wizard wizard-summary">
      <p className="wizard-card-context">
        Reporting on <strong>{card.name}</strong> — {card.set_name} ({card.set.toUpperCase()}) #
        {card.collector_number} · {card.lang}
      </p>
      <h2>Review: {config.title}</h2>

      {isIncomplete && (
        <p className="wizard-incomplete-banner">
          Incomplete report — missing {missingSteps.map((step) => step.label.toLowerCase()).join(', ')}.
          It can still be submitted; the community will be able to complete it later.
        </p>
      )}

      <p>
        Report generation and submission ship in a later step — for now, here's what would be
        included:
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
      <button type="button" onClick={onExit}>
        Start a new report
      </button>

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

export default WizardSummary
