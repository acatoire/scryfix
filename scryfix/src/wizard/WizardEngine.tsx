import { useState } from 'react'
import type { ScryfallCard } from '../lib/scryfall'
import AttachmentsStep from './steps/AttachmentsStep'
import SelectStep from './steps/SelectStep'
import TextareaStep from './steps/TextareaStep'
import UrlListStep from './steps/UrlListStep'
import type { Attachment, WizardAnswers, WizardConfig } from './types'
import { canSkipAsIncomplete, isStepAnswered } from './validation'
import WizardSummary from './WizardSummary'
import './WizardEngine.css'

interface WizardEngineProps {
  config: WizardConfig
  card: ScryfallCard
  onExit: () => void
}

function WizardEngine({ config, card, onExit }: WizardEngineProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})
  const [skipped, setSkipped] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState(false)

  const step = config.steps[stepIndex]
  const isLastStep = stepIndex === config.steps.length - 1
  const canAdvance = isStepAnswered(step, answers[step.id], skipped[step.id])

  function setAnswer(id: string, value: WizardAnswers[string]) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  function setAttachments(id: string, value: Attachment[]) {
    setAnswer(id, value)
    if (value.length > 0) setSkipped((prev) => ({ ...prev, [id]: false }))
  }

  if (done) {
    return (
      <WizardSummary config={config} card={card} answers={answers} skipped={skipped} onExit={onExit} />
    )
  }

  return (
    <div className="wizard">
      <p className="wizard-card-context">
        Reporting on <strong>{card.name}</strong> — {card.set_name} ({card.set.toUpperCase()}) #
        {card.collector_number} · {card.lang}
      </p>
      <h2>{config.title}</h2>
      <p className="wizard-progress">
        Step {stepIndex + 1} of {config.steps.length}
      </p>

      {step.kind === 'select' && (
        <SelectStep
          step={step}
          value={answers[step.id] as string | undefined}
          onChange={(value) => setAnswer(step.id, value)}
        />
      )}
      {step.kind === 'textarea' && (
        <TextareaStep
          step={step}
          value={answers[step.id] as string | undefined}
          onChange={(value) => setAnswer(step.id, value)}
        />
      )}
      {step.kind === 'attachments' && (
        <>
          <AttachmentsStep
            step={step}
            value={answers[step.id] as Attachment[] | undefined}
            onChange={(value) => setAttachments(step.id, value)}
          />
          {canSkipAsIncomplete(step) && (
            <label className="wizard-skip-incomplete">
              <input
                type="checkbox"
                checked={skipped[step.id] ?? false}
                onChange={(event) =>
                  setSkipped((prev) => ({ ...prev, [step.id]: event.target.checked }))
                }
              />
              I don't have this yet — submit as incomplete and let the community add it later
            </label>
          )}
        </>
      )}
      {step.kind === 'urlList' && (
        <UrlListStep
          step={step}
          value={answers[step.id] as string[] | undefined}
          onChange={(value) => setAnswer(step.id, value)}
        />
      )}

      <div className="wizard-nav">
        <button type="button" onClick={() => (stepIndex === 0 ? onExit() : setStepIndex((i) => i - 1))}>
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => (isLastStep ? setDone(true) : setStepIndex((i) => i + 1))}
        >
          {isLastStep ? 'Review' : 'Next'}
        </button>
      </div>
    </div>
  )
}

export default WizardEngine
