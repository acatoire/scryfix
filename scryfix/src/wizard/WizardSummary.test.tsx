import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import { downloadReportZip } from '../report/downloadReportZip'
import { GitHubClientError, submitReport } from '../lib/github'
import { validateReport } from '../report/validateReport'
import type { Attachment } from './types'
import WizardSummary from './WizardSummary'
import { missingImageLanguageWizard } from './wizards/missingImageLanguage'

vi.mock('../report/downloadReportZip', () => ({
  downloadReportZip: vi.fn(),
}))

vi.mock('../lib/github', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/github')>()),
  submitReport: vi.fn(),
}))

vi.mock('../lib/githubAuth', () => ({
  getGitHubAuth: () => ({ getToken: () => null, setToken: vi.fn() }),
}))

vi.mock('../report/validateReport', () => ({
  validateReport: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}))

vi.mock('../components/GitHubConnect', () => ({
  default: ({ onConnected }: { onConnected: (username: string) => void }) => (
    <button type="button" onClick={() => onConnected('octocat')}>
      Fake connect
    </button>
  ),
}))

const card = makeCard()

const fixFileAttachment: Attachment = {
  id: 'f1',
  value: { kind: 'file', file: new File(['x'], 'fix.png', { type: 'image/png' }), previewUrl: 'blob:fix' },
}

describe('WizardSummary', () => {
  beforeEach(() => {
    // Clears call history only (not the default mockResolvedValue set in the vi.mock factories
    // above) — without this, an earlier test's real submitReport/validateReport call still shows
    // up in a later test's .not.toHaveBeenCalled()/toHaveBeenCalledWith assertions.
    vi.clearAllMocks()
  })

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

  it('prompts to connect GitHub before allowing a submit, then submits after connecting', async () => {
    vi.mocked(submitReport).mockResolvedValue({
      prUrl: 'https://github.com/acatoire/scryfix-reports/pull/1',
      prNumber: 1,
    })
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{ affected_language: 'fr' }}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Submit as GitHub PR' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))

    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(submitReport).toHaveBeenCalledTimes(1)
    const [call] = vi.mocked(submitReport).mock.calls[0]
    expect(call.report.reporter).toEqual({ github_username: 'octocat' })
    expect(await screen.findByRole('link', { name: 'View the pull request' })).toHaveAttribute(
      'href',
      'https://github.com/acatoire/scryfix-reports/pull/1',
    )
  })

  it('blocks submission and never calls submitReport when schema validation fails', async () => {
    vi.mocked(validateReport).mockResolvedValueOnce({
      valid: false,
      errors: ["/reporter must have required property 'github_username'"],
    })
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText(/failed schema validation/)).toBeInTheDocument()
    expect(submitReport).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('Error details'))
    expect(screen.getByText(/must have required property 'github_username'/)).toBeInTheDocument()
  })

  it('shows the GitHubClientError message when submission fails', async () => {
    vi.mocked(submitReport).mockRejectedValueOnce(new GitHubClientError('Not signed in to GitHub.'))
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText('Not signed in to GitHub.', { selector: 'p' })).toBeInTheDocument()
  })

  it('shows a generic error for a non-GitHubClientError submission failure, with raw detail in an accordion', async () => {
    vi.mocked(submitReport).mockRejectedValueOnce(new Error('network down'))
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText('Could not submit to GitHub: network down')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Error details'))
    expect(screen.getByText(/network down/, { selector: 'pre' })).toBeInTheDocument()
  })

  it('shows the raw GitHub API response in the error accordion for an Octokit-shaped error', async () => {
    vi.mocked(submitReport).mockRejectedValueOnce({
      name: 'HttpError',
      status: 404,
      message: 'Not Found',
      response: {
        status: 404,
        url: 'https://api.github.com/repos/acatoire/scryfix-reports/forks',
        data: { message: 'Not Found', documentation_url: 'https://docs.github.com/rest/repos/forks' },
      },
    })
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText('GitHub API error 404: Not Found')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Error details'))
    expect(screen.getByText(/documentation_url/, { selector: 'pre' })).toBeInTheDocument()
  })
})
