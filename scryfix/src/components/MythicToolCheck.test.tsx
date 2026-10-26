import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import MythicToolCheck from './MythicToolCheck'

const checkboxLabel = 'Also search this card on mythic.tool'

describe('MythicToolCheck', () => {
  it('shows no link until the checkbox is ticked', async () => {
    const card = makeCard({ name: 'Fire // Ice' })
    render(<MythicToolCheck card={card} />)
    expect(screen.getByLabelText(checkboxLabel)).not.toBeChecked()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText(checkboxLabel))
    const link = screen.getByRole('link', { name: 'Search Fire // Ice on mythic.tool' })
    expect(link).toHaveAttribute('href', 'https://mythic.tool/?q=Fire%20%2F%2F%20Ice')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('unticking removes the link', async () => {
    render(<MythicToolCheck card={makeCard()} />)
    await userEvent.click(screen.getByLabelText(checkboxLabel))
    await userEvent.click(screen.getByLabelText(checkboxLabel))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
