import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WizardStepDef } from '../types'
import SelectStep from './SelectStep'

const step: WizardStepDef & { kind: 'select' } = {
  kind: 'select',
  id: 'affected_language',
  label: 'Which language?',
  optionsSource: 'scryfallLanguages',
}

describe('SelectStep', () => {
  it('renders the label and a placeholder option', () => {
    render(<SelectStep step={step} value={undefined} onChange={() => {}} />)
    expect(screen.getByText('Which language?')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('lists Scryfall languages as options', () => {
    render(<SelectStep step={step} value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'French' })).toBeInTheDocument()
  })

  it('calls onChange with the selected language code', async () => {
    const onChange = vi.fn()
    render(<SelectStep step={step} value={undefined} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')

    expect(onChange).toHaveBeenCalledWith('fr')
  })

  it('reflects the current value', () => {
    render(<SelectStep step={step} value="fr" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('fr')
  })
})
