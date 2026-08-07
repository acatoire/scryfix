import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import { downloadReportZip } from '../report/downloadReportZip'
import type { Attachment } from './types'
import WizardSummary from './WizardSummary'
import { missingImageLanguageWizard } from './wizards/missingImageLanguage'

vi.mock('../report/downloadReportZip', () => ({
  downloadReportZip: vi.fn(),
}))

const card = makeCard()

const fixFileAttachment: Attachment = {
  id: 'f1',
  value: { kind: 'file', file: new File(['x'], 'fix.png', { type: 'image/png' }), previewUrl: 'blob:fix' },
}

describe('WizardSummary', () => {
  it('shows the card context, title, and formatted answers', () => {
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{ affected_language: 'fr', description: 'looks wrong' }}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    expect(
      screen.getByRole('heading', { name: `Review: ${missingImageLanguageWizard.title}` }),
    ).toBeInTheDocument()
    expect(screen.getByText('French (fr)')).toBeInTheDocument()
    expect(screen.getByText('looks wrong')).toBeInTheDocument()
  })

  it('shows an incomplete banner and per-row tag when a required step was skipped', () => {
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{ fix_files: true }}
        onExit={() => {}}
      />,
    )

    expect(screen.getByText(/Incomplete report — missing/)).toBeInTheDocument()
    expect(screen.getByText('Not provided — marked incomplete')).toBeInTheDocument()
  })

  it('shows an attachment thumbnail and opens/closes a lightbox on click', async () => {
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{ fix_files: [fixFileAttachment] }}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'fix.png' }))
    // ImageLightbox's own <img> is decorative (alt=""), so it's role "presentation", not "img" —
    // distinct from the always-present small thumbnail, which does have role "img".
    const lightboxImage = screen.getByRole('presentation')
    expect(lightboxImage).toHaveAttribute('src', 'blob:fix')

    await userEvent.click(lightboxImage)
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
  })

  it('calls onExit when "Start a new report" is clicked', async () => {
    const onExit = vi.fn()
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={onExit}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start a new report' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('downloads the built report as a zip', async () => {
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{ affected_language: 'fr' }}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Download report (.zip)' }))

    expect(downloadReportZip).toHaveBeenCalledTimes(1)
    const [report] = vi.mocked(downloadReportZip).mock.calls[0]
    expect(report.details).toEqual({ affected_language: 'fr' })
  })

  it('shows an error message if the download fails', async () => {
    vi.mocked(downloadReportZip).mockRejectedValueOnce(new Error('boom'))
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Download report (.zip)' }))

    expect(await screen.findByText(/Could not build the download/)).toBeInTheDocument()
  })
})
