import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ImageLightbox from './ImageLightbox'

describe('ImageLightbox', () => {
  it('renders the given image', () => {
    render(<ImageLightbox url="https://example.com/big.png" onClose={() => {}} />)
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'https://example.com/big.png')
  })

  it('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn()
    render(<ImageLightbox url="https://example.com/big.png" onClose={onClose} />)

    await userEvent.click(screen.getByRole('presentation'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
