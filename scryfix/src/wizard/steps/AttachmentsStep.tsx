import { useState } from 'react'
import type { Attachment, WizardStepDef } from '../types'

interface AttachmentsStepProps {
  step: WizardStepDef & { kind: 'attachments' }
  value: Attachment[] | undefined
  onChange: (value: Attachment[]) => void
}

function AttachmentsStep({ step, value = [], onChange }: AttachmentsStepProps) {
  const [urlDraft, setUrlDraft] = useState('')

  function addFiles(files: FileList | null) {
    if (!files) return
    const added: Attachment[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      value: { kind: 'file', file, previewUrl: URL.createObjectURL(file) },
    }))
    onChange([...value, ...added])
  }

  function addUrl() {
    const url = urlDraft.trim()
    if (!url) return
    onChange([...value, { id: crypto.randomUUID(), value: { kind: 'url', url } }])
    setUrlDraft('')
  }

  function remove(id: string) {
    const attachment = value.find((item) => item.id === id)
    if (attachment?.value.kind === 'file') URL.revokeObjectURL(attachment.value.previewUrl)
    onChange(value.filter((item) => item.id !== id))
  }

  return (
    <div className="wizard-field">
      <span>
        {step.label}
        {step.required && <span className="wizard-required"> (required)</span>}
      </span>

      {value.length > 0 && (
        <ul className="wizard-attachments">
          {value.map((attachment) => (
            <li key={attachment.id}>
              {attachment.value.kind === 'file' ? (
                <>
                  <img src={attachment.value.previewUrl} alt="" width={48} height={67} />
                  <span>{attachment.value.file.name}</span>
                </>
              ) : (
                <a href={attachment.value.url} target="_blank" rel="noreferrer">
                  {attachment.value.url}
                </a>
              )}
              <button type="button" onClick={() => remove(attachment.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="wizard-attachment-add">
        <label className="wizard-file-button">
          Upload image
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
        <span>or</span>
        <input
          type="url"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="https://…"
        />
        <button type="button" onClick={addUrl}>
          Add link
        </button>
      </div>
    </div>
  )
}

export default AttachmentsStep
