import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test-utils/scryfallFixtures'
import WizardEngine from './WizardEngine'
import { missingImageLanguageWizard } from './wizards/missingImageLanguage'

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
})
