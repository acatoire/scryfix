import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Attachment, WizardStepDef } from '../types'
import AttachmentsStep from './AttachmentsStep'

const step: WizardStepDef & { kind: 'attachments' } = {
  kind: 'attachments',
  id: 'fix_files',
  label: 'Upload the correct image',
  required: true,
}

describe('AttachmentsStep', () => {
  it('shows the required marker', () => {
    render(<AttachmentsStep step={step} value={[]} onChange={() => {}} />)
    expect(screen.getByText('(required)')).toBeInTheDocument()
  })

  it('does not show a required marker when the step is optional', () => {
    render(
      <AttachmentsStep step={{ ...step, required: false }} value={[]} onChange={() => {}} />,
    )
    expect(screen.queryByText('(required)')).not.toBeInTheDocument()
  })

  it('adds an uploaded file as a file-kind attachment', async () => {
    const onChange = vi.fn()
    render(<AttachmentsStep step={step} value={[]} onChange={onChange} />)

    const file = new File(['data'], 'card.png', { type: 'image/png' })
    const input = screen.getByLabelText('Upload image', { selector: 'input' })
    await userEvent.upload(input, file)

    expect(onChange).toHaveBeenCalledTimes(1)
    const added = onChange.mock.calls[0][0] as Attachment[]
    expect(added).toHaveLength(1)
    expect(added[0].value).toMatchObject({ kind: 'file', file })
  })

  it('adds a pasted url as a url-kind attachment and clears the draft', async () => {
    const onChange = vi.fn()
    render(<AttachmentsStep step={step} value={[]} onChange={onChange} />)

    const input = screen.getByPlaceholderText('https://…')
    await userEvent.type(input, 'https://example.com/fix.png')
    await userEvent.click(screen.getByRole('button', { name: 'Add link' }))

    const added = onChange.mock.calls[0][0] as Attachment[]
    expect(added[0].value).toEqual({ kind: 'url', url: 'https://example.com/fix.png' })
    expect(input).toHaveValue('')
  })

  it('renders existing attachments and removes one on click', async () => {
    const existing: Attachment[] = [
      { id: '1', value: { kind: 'url', url: 'https://example.com/fix.png' } },
      { id: '2', value: { kind: 'file', file: new File(['x'], 'a.png'), previewUrl: 'blob:1' } },
    ]
    const onChange = vi.fn()
    render(<AttachmentsStep step={step} value={existing} onChange={onChange} />)

    expect(screen.getByRole('link', { name: 'https://example.com/fix.png' })).toBeInTheDocument()
    expect(screen.getByText('a.png')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    expect(onChange).toHaveBeenCalledWith([existing[1]])
  })
})
