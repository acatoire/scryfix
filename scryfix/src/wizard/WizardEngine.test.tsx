import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getSet } from '../lib/scryfall'
import { makeCard } from '../test-utils/scryfallFixtures'
import WizardEngine from './WizardEngine'
import { missingImageLanguageWizard } from './wizards/missingImageLanguage'
import { unlistedPrintingWizard } from './wizards/unlistedPrinting'

vi.mock('../lib/scryfall', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/scryfall')>()),
  getSet: vi.fn(),
  getCardLanguages: vi.fn().mockResolvedValue([]),
}))

vi.mock('../lib/duplicates', () => ({
  findRelatedUnlistedReports: vi.fn().mockResolvedValue([]),
}))

const card = makeCard()

function nextButton() {
  return screen.getByRole('button', { name: /Next|Review/ })
}

describe('WizardEngine', () => {
  it('shows the card context and step progress', () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)
    expect(screen.getByText(/Reporting on/)).toHaveTextContent('Cold-Eyed Selkie')
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
  })

  it('calls onExit when Cancel is clicked on the first step', async () => {
    const onExit = vi.fn()
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={onExit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('gates Next until the required select step is answered, then advances', async () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)

    expect(nextButton()).toBeDisabled()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')
    expect(nextButton()).toBeEnabled()

    await userEvent.click(nextButton())
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
  })

  it('going Back preserves the earlier answer', async () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')
    await userEvent.click(nextButton())
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('combobox')).toHaveValue('fr')
  })

  it('lets a required attachments step be skipped as incomplete', async () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')
    await userEvent.click(nextButton())

    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
    expect(nextButton()).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox'))
    expect(nextButton()).toBeEnabled()
  })

  it('uploading a file un-checks the skip-as-incomplete box', async () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')
    await userEvent.click(nextButton())
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()

    const file = new File(['data'], 'fix.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Upload image', { selector: 'input' }), file)

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(nextButton()).toBeEnabled()
  })

  it('walks to the end and shows the review screen, flagging the skipped step', async () => {
    render(<WizardEngine config={missingImageLanguageWizard} card={card} onExit={() => {}} />)

    // step 1: language
    await userEvent.selectOptions(screen.getByRole('combobox'), 'French')
    await userEvent.click(nextButton())
    // step 2: fix_files (required) — skip as incomplete
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(nextButton())
    // step 3: evidence (optional attachments)
    await userEvent.click(nextButton())
    // step 4: external_refs (url list, never required)
    await userEvent.click(nextButton())
    // step 5: description (optional textarea) — last step, button reads "Review"
    await userEvent.click(nextButton())

    expect(
      screen.getByRole('heading', { name: `Review: ${missingImageLanguageWizard.title}` }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Incomplete report/)).toBeInTheDocument()
  })

  it('renders text and setCode steps (once each) for the unlisted_printing wizard', async () => {
    vi.mocked(getSet).mockResolvedValue({ code: 'woe', name: 'Wilds of Eldraine', set_type: 'expansion' })
    render(<WizardEngine config={unlistedPrintingWizard} card={card} onExit={() => {}} />)

    // step 1: setCode — Next stays disabled until Scryfall confirms the set
    expect(screen.getAllByLabelText(/Set code of the missing printing/)).toHaveLength(1)
    expect(nextButton()).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Set code of the missing printing/), 'woe')
    await userEvent.click(screen.getByRole('button', { name: 'Verify set' }))
    expect(await screen.findByText('Found set: Wilds of Eldraine')).toBeInTheDocument()
    await userEvent.click(nextButton())

    // step 2: optional text
    expect(screen.getAllByLabelText(/Collector number/)).toHaveLength(1)
    await userEvent.type(screen.getByLabelText(/Collector number/), '287')
    await userEvent.click(nextButton())
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument()
  })
})
