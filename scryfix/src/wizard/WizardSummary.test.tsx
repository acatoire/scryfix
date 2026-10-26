import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import { downloadReportZip } from '../report/downloadReportZip'
import { GitHubClientError, UPSTREAM_REPO, submitReports } from '../lib/github'
import { getLastPullRequestDate } from '../lib/githubRead'
import type { Report } from '../report/types'
import { validateReport } from '../report/validateReport'
import type { Attachment } from './types'
import WizardSummary from './WizardSummary'
import { missingImageLanguageWizard } from './wizards/missingImageLanguage'
import { otherWizard } from './wizards/other'
import { unlistedPrintingWizard } from './wizards/unlistedPrinting'

vi.mock('../report/downloadReportZip', () => ({
  downloadReportZip: vi.fn(),
}))

vi.mock('../lib/github', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/github')>()),
  submitReports: vi.fn(),
}))

vi.mock('../lib/githubRead', () => ({
  getLastPullRequestDate: vi.fn().mockResolvedValue(null),
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
    // above) — without this, an earlier test's real submitReports/validateReport call still shows
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

  it('formats text, setCode and static-option select answers as-is', () => {
    render(
      <WizardSummary
        config={unlistedPrintingWizard}
        card={card}
        answers={{ set_code: 'woe', collector_number: '287', affected_language: 'fr' }}
        skipped={{}}
        onExit={() => {}}
      />,
    )
    expect(screen.getByText('woe')).toBeInTheDocument()
    expect(screen.getByText('287')).toBeInTheDocument()
    expect(screen.getByText('French (fr)')).toBeInTheDocument()
  })

  it('shows the chosen static option of a select step', () => {
    render(
      <WizardSummary
        config={otherWizard}
        card={card}
        answers={{ category_hint: 'Type line', description: 'wrong type' }}
        skipped={{}}
        onExit={() => {}}
      />,
    )
    expect(screen.getByText('Type line')).toBeInTheDocument()
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
    vi.mocked(submitReports).mockResolvedValue({
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

    expect(submitReports).toHaveBeenCalledTimes(1)
    const [call] = vi.mocked(submitReports).mock.calls[0]
    expect(call.reports[0].report.reporter).toEqual({ github_username: 'octocat' })
    expect(await screen.findByRole('link', { name: 'View the pull request' })).toHaveAttribute(
      'href',
      'https://github.com/acatoire/scryfix-reports/pull/1',
    )
  })

  it('blocks submission and never calls submitReports when schema validation fails', async () => {
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
    expect(submitReports).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('Error details'))
    expect(screen.getByText(/must have required property 'github_username'/)).toBeInTheDocument()
  })

  it('shows the GitHubClientError message when submission fails', async () => {
    vi.mocked(submitReports).mockRejectedValueOnce(new GitHubClientError('Not signed in to GitHub.'))
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
    vi.mocked(submitReports).mockRejectedValueOnce(new Error('network down'))
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
    vi.mocked(submitReports).mockRejectedValueOnce({
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

  it('blocks submission when the wizard was completed too quickly', async () => {
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
        startedAt={Date.now()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText(/That was quick/)).toBeInTheDocument()
    expect(getLastPullRequestDate).not.toHaveBeenCalled()
    expect(validateReport).not.toHaveBeenCalled()
    expect(submitReports).not.toHaveBeenCalled()
  })

  it('blocks submission when the account just opened another PR', async () => {
    vi.mocked(getLastPullRequestDate).mockResolvedValueOnce(new Date().toISOString())
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

    expect(await screen.findByText(/please wait/)).toBeInTheDocument()
    expect(getLastPullRequestDate).toHaveBeenCalledWith(UPSTREAM_REPO, 'octocat')
    expect(validateReport).not.toHaveBeenCalled()
    expect(submitReports).not.toHaveBeenCalled()
  })

  it('still submits when the last-PR lookup fails', async () => {
    vi.mocked(getLastPullRequestDate).mockRejectedValueOnce(new Error('rate limited'))
    vi.mocked(submitReports).mockResolvedValue({ prUrl: 'https://github.com/x/pull/2', prNumber: 2 })
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

    expect(await screen.findByRole('link', { name: 'View the pull request' })).toBeInTheDocument()
    expect(submitReports).toHaveBeenCalledTimes(1)
  })

  it('submits queued batch reports together with the current one', async () => {
    vi.mocked(submitReports).mockResolvedValue({ prUrl: 'https://github.com/x/pull/3', prNumber: 3 })
    const queued = {
      report: buildQueuedReport(),
      files: [],
    }
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
        batch={[queued]}
      />,
    )

    expect(screen.getByText(/Multi-card report: 1 other card queued/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    await screen.findByRole('link', { name: 'View the pull request' })
    expect(validateReport).toHaveBeenCalledTimes(2)
    const [call] = vi.mocked(submitReports).mock.calls[0]
    expect(call.reports).toHaveLength(2)
    expect(call.reports[0].report.report_id).toBe('queued-1')
    expect(call.reports[0].report.reporter).toEqual({ github_username: 'octocat' })
    expect(call.reports[1].report.reporter).toEqual({ github_username: 'octocat' })
  })

  it('blocks the whole batch when a queued report fails schema validation', async () => {
    vi.mocked(validateReport).mockResolvedValueOnce({ valid: false, errors: ['/card/name bad'] })
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
        batch={[{ report: buildQueuedReport(), files: [] }]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    expect(await screen.findByText(/failed schema validation/)).toBeInTheDocument()
    expect(submitReports).not.toHaveBeenCalled()
  })

  it('queues the current report with its shared answers via "Add another card"', async () => {
    const onAddCard = vi.fn()
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{ description: 'same issue', external_refs: ['https://example.com/a'] }}
        skipped={{}}
        onExit={() => {}}
        onAddCard={onAddCard}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add another card to this report' }))

    expect(onAddCard).toHaveBeenCalledTimes(1)
    const [entry, shared] = onAddCard.mock.calls[0]
    expect(entry.report.description).toBe('same issue')
    expect(shared).toEqual({ description: 'same issue', external_refs: ['https://example.com/a'] })
  })

  it('hides "Add another card" once the pull request is open', async () => {
    vi.mocked(submitReports).mockResolvedValue({ prUrl: 'https://github.com/x/pull/4', prNumber: 4 })
    render(
      <WizardSummary
        config={missingImageLanguageWizard}
        card={card}
        answers={{}}
        skipped={{}}
        onExit={() => {}}
        onAddCard={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Add another card to this report' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fake connect' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit as GitHub PR' }))

    await screen.findByRole('link', { name: 'View the pull request' })
    expect(screen.queryByRole('button', { name: 'Add another card to this report' })).not.toBeInTheDocument()
  })
})

function buildQueuedReport(): Report {
  return {
    schema_version: '1.0',
    report_id: 'queued-1',
    created_at: '2026-01-01T00:00:00.000Z',
    error_type: 'missing_image_language',
    card: {
      set: 'afc',
      collector_number: '184',
      scryfall_id: 'q',
      name: 'Queued',
      lang: 'en',
      scryfall_url: 'https://scryfall.com/card/afc/184',
    },
    unlisted: { is_unlisted: false, set_code: null, collector_number_hash: null },
    details: {},
    description: '',
    evidence: [],
    fix_files: [],
    external_refs: [],
    reporter: { github_username: null },
    incomplete: false,
    missing: [],
  }
}
