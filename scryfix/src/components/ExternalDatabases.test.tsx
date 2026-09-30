import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import ExternalDatabases from './ExternalDatabases'

const card = makeCard()

describe('ExternalDatabases', () => {
  it('shows no links until a database is ticked', async () => {
    render(<ExternalDatabases card={card} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('mythic.tool'))
    const link = screen.getByRole('link', { name: `Search ${card.name} on mythic.tool` })
    expect(link.getAttribute('href')).toContain(encodeURIComponent(card.name))
  })

  it('unticking removes the link', async () => {
    render(<ExternalDatabases card={card} />)
    await userEvent.click(screen.getByLabelText('mythic.tool'))
    await userEvent.click(screen.getByLabelText('mythic.tool'))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('opens every ticked database at once', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<ExternalDatabases card={card} />)
    await userEvent.click(screen.getByLabelText('mythic.tool'))
    await userEvent.click(screen.getByLabelText('Cardmarket'))
    await userEvent.click(screen.getByRole('button', { name: 'Open all selected' }))
    expect(open).toHaveBeenCalledTimes(2)
    open.mockRestore()
  })
})
