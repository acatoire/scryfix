import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WizardStepDef } from '../types'
import TextStep from './TextStep'

const step: WizardStepDef & { kind: 'text' } = {
  kind: 'text',
  id: 'collector_number',
  label: 'Collector number',
  placeholder: 'e.g. 123',
}

describe('TextStep', () => {
  it('renders label, placeholder and current value', () => {
    render(<TextStep step={step} value="42" onChange={() => {}} />)
    expect(screen.getByLabelText('Collector number')).toHaveValue('42')
    expect(screen.getByPlaceholderText('e.g. 123')).toBeInTheDocument()
  })

  it('reports typed text', async () => {
    const onChange = vi.fn()
    render(<TextStep step={step} value={undefined} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Collector number'), '7')
    expect(onChange).toHaveBeenLastCalledWith('7')
  })
})
