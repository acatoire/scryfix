import type { WizardConfig } from '../types'

// doc/project-plan.md §5.3 — the printing doesn't exist on Scryfall at all. The card photo maps onto
// `fix_files` (it is both the proof and the asset to ingest). The card chosen in the lookup step is
// a related printing of the same card (same name) so the report still names the card.
export const unlistedPrintingWizard: WizardConfig = {
  schemaVersion: '1.0',
  id: 'unlisted_printing',
  title: 'Printing missing from Scryfall',
  steps: [
    {
      kind: 'setCode',
      id: 'set_code',
      label: 'Set code of the missing printing (e.g. "woe")',
      required: true,
    },
    {
      kind: 'text',
      id: 'collector_number',
      label: 'Collector number (leave empty if unknown)',
      placeholder: 'e.g. 287',
    },
    {
      kind: 'select',
      id: 'affected_language',
      label: 'Language of the missing printing',
      optionsSource: 'scryfallLanguages',
    },
    {
      kind: 'attachments',
      id: 'fix_files',
      label: 'Upload a photo/scan of the card',
      required: true,
    },
    {
      kind: 'urlList',
      id: 'external_refs',
      label: 'Links to other sources listing this printing (optional)',
    },
    {
      kind: 'textarea',
      id: 'description',
      label: 'Anything else to add? (optional)',
    },
  ],
}
