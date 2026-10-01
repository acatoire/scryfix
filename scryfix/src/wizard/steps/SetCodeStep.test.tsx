import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WizardStepDef } from '../types'

const getSet = vi.fn()
const findRelatedUnlistedReports = vi.fn()

vi.mock('../../lib/scryfall', () => ({ getSet: (code: string) => getSet(code) }))
vi.mock('../../lib/duplicates', () => ({
  findRelatedUnlistedReports: (...args: unknown[]) => findRelatedUnlistedReports(...args),
}))

import SetCodeStep from './SetCodeStep'

const step: WizardStepDef & { kind: 'setCode' } = { kind: 'setCode', id: 'set_code', label: 'Set code', required: true }

beforeEach(() => {
  vi.resetAllMocks()
  findRelatedUnlistedReports.mockResolvedValue([])
})

describe('SetCodeStep', () => {
  it('reports the verified, normalized set code', async () => {
    getSet.mockResolvedValue({ code: 'woe', name: 'Wilds of Eldraine' })
    const onChange = vi.fn()
    render(<SetCodeStep step={step} value={undefined} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Set code'), 'WOE')
    await userEvent.click(screen.getByRole('button', { name: 'Verify set' }))

    expect(await screen.findByText('Found set: Wilds of Eldraine')).toBeInTheDocument()
    expect(getSet).toHaveBeenCalledWith('woe')
    expect(onChange).toHaveBeenLastCalledWith('woe')
  })

  it('clears the answer and shows an error for an unknown set', async () => {
    getSet.mockRejectedValue(new Error('nope'))
    const onChange = vi.fn()
    render(<SetCodeStep step={step} value={undefined} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Set code'), 'zzz')
    await userEvent.click(screen.getByRole('button', { name: 'Verify set' }))

    expect(await screen.findByText('Scryfall has no set with code "zzz".')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('lists existing unlisted reports for the set', async () => {
    getSet.mockResolvedValue({ code: 'woe', name: 'Wilds of Eldraine' })
    findRelatedUnlistedReports.mockResolvedValue([
      { status: 'open', title: '[unlisted_printing] X', url: 'https://gh/pull/3', errorType: null, prNumber: 3 },
    ])
    render(<SetCodeStep step={step} value={undefined} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('Set code'), 'woe')
    await userEvent.click(screen.getByRole('button', { name: 'Verify set' }))

    expect(await screen.findByRole('link', { name: '[unlisted_printing] X' })).toHaveAttribute(
      'href',
      'https://gh/pull/3',
    )
  })

  it('still verifies when the duplicate lookup fails', async () => {
    getSet.mockResolvedValue({ code: 'woe', name: 'Wilds of Eldraine' })
    findRelatedUnlistedReports.mockRejectedValue(new Error('rate limited'))
    const onChange = vi.fn()
    render(<SetCodeStep step={step} value={undefined} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Set code'), 'woe')
    await userEvent.click(screen.getByRole('button', { name: 'Verify set' }))

    expect(await screen.findByText('Found set: Wilds of Eldraine')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('woe')
  })

  it('resets the answer when the input is edited', async () => {
    const onChange = vi.fn()
    render(<SetCodeStep step={step} value="woe" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Set code'), 'x')
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
