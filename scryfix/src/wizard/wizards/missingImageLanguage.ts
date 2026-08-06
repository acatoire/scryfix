import type { WizardConfig } from '../types'

// doc/project-plan.md §5.2/§5.3 — card_lookup and duplicate_check aren't part of this list: card
// lookup happens before the wizard starts, and duplicate_check is Phase 3.
export const missingImageLanguageWizard: WizardConfig = {
  schemaVersion: '1.0',
  id: 'missing_image_language',
  title: 'Missing image for a specific language',
  steps: [
    {
      kind: 'select',
      id: 'affected_language',
      label: 'Which language has a wrong or missing image?',
      optionsSource: 'scryfallLanguages',
    },
    {
      kind: 'attachments',
      id: 'fix_files',
      label: 'Upload the correct card image for this language/printing',
      required: true,
    },
    {
      kind: 'attachments',
      id: 'evidence',
      label: 'Optional: screenshot showing the image is missing on Scryfall',
    },
    {
      kind: 'urlList',
      id: 'external_refs',
      label: 'Links to other sources that have this image (optional)',
    },
    {
      kind: 'textarea',
      id: 'description',
      label: 'Anything else to add? (optional)',
    },
  ],
}
