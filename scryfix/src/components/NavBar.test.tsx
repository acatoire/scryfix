import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

describe('NavBar', () => {
  it('links to the home and stats pages', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Report an issue' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Stats dashboard' })).toHaveAttribute('href', '/stats')
  })

  it('marks the current page as active', () => {
    render(
      <MemoryRouter initialEntries={['/stats']}>
        <NavBar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Stats dashboard' })).toHaveClass('nav-bar-active')
    expect(screen.getByRole('link', { name: 'Report an issue' })).not.toHaveClass('nav-bar-active')
  })
})
