import type { WizardConfig } from '../types'

// doc/project-plan.md §5.3 — the image exists but is tagged/shown as the wrong language. A
// screenshot of the current state is recommended (not required): the problem is a wrong label, so
// seeing what Scryfall currently shows is more informative than in the missing-image case.
export const wrongImageLanguageWizard: WizardConfig = {
  schemaVersion: '1.0',
  id: 'wrong_image_language',
  title: 'Image shown in the wrong language',
  steps: [
    {
      kind: 'select',
      id: 'shown_as_language',
      label: 'Which language does Scryfall currently show for this image?',
      optionsSource: 'scryfallLanguages',
    },
    {
      kind: 'select',
      id: 'should_be_language',
      label: 'Which language is the image actually in?',
      optionsSource: 'scryfallLanguages',
    },
    {
      kind: 'attachments',
      id: 'fix_files',
      label: 'Upload the correct card image (if it differs from what is displayed)',
      required: true,
    },
    {
      kind: 'attachments',
      id: 'evidence',
      label: 'Recommended: screenshot of the wrong image as displayed on Scryfall',
      help: 'A screenshot of the current state makes the mislabeling easy to verify.',
    },
    {
      kind: 'urlList',
      id: 'external_refs',
      label: 'Links to other sources that show the correct language (optional)',
    },
    {
      kind: 'textarea',
      id: 'description',
      label: 'Anything else to add? (optional)',
    },
  ],
}
