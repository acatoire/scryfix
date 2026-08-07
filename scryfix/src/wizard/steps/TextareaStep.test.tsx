import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WizardStepDef } from '../types'
import TextareaStep from './TextareaStep'

const step: WizardStepDef & { kind: 'textarea' } = {
  kind: 'textarea',
  id: 'description',
  label: 'Anything else?',
}

describe('TextareaStep', () => {
  it('renders the label and current value', () => {
    render(<TextareaStep step={step} value="hello" onChange={() => {}} />)
    expect(screen.getByText('Anything else?')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('defaults to an empty string when value is undefined', () => {
    render(<TextareaStep step={step} value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn()
    render(<TextareaStep step={step} value="" onChange={onChange} />)

    await userEvent.type(screen.getByRole('textbox'), 'hi')

    expect(onChange).toHaveBeenCalledWith('h')
    expect(onChange).toHaveBeenCalledWith('i')
  })
})
