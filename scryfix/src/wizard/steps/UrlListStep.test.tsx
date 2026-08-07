import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WizardStepDef } from '../types'
import UrlListStep from './UrlListStep'

const step: WizardStepDef & { kind: 'urlList' } = {
  kind: 'urlList',
  id: 'external_refs',
  label: 'External references',
}

describe('UrlListStep', () => {
  it('renders existing urls as links with a remove button', () => {
    render(
      <UrlListStep step={step} value={['https://a.example.com']} onChange={() => {}} />,
    )
    expect(screen.getByRole('link', { name: 'https://a.example.com' })).toHaveAttribute(
      'href',
      'https://a.example.com',
    )
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('adds a typed url on "Add link" and clears the draft input', async () => {
    const onChange = vi.fn()
    render(<UrlListStep step={step} value={[]} onChange={onChange} />)

    const input = screen.getByPlaceholderText('https://…')
    await userEvent.type(input, 'https://new.example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Add link' }))

    expect(onChange).toHaveBeenCalledWith(['https://new.example.com'])
    expect(input).toHaveValue('')
  })

  it('does not add an empty/blank url', async () => {
    const onChange = vi.fn()
    render(<UrlListStep step={step} value={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add link' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a url by index', async () => {
    const onChange = vi.fn()
    render(
      <UrlListStep
        step={step}
        value={['https://a.example.com', 'https://b.example.com']}
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    expect(onChange).toHaveBeenCalledWith(['https://b.example.com'])
  })
})
