import type { WizardConfig } from '../types'

// doc/project-plan.md §5.4 — fallback for anything the dedicated wizards don't cover. Structured
// (category_hint + required description) so free-form reports stay machine-parseable.
export const otherWizard: WizardConfig = {
  schemaVersion: '1.0',
  id: 'other',
  title: 'Other data error',
  steps: [
    {
      kind: 'select',
      id: 'category_hint',
      label: 'Which best describes the problem?',
      options: ['Rules text', 'Mana cost / color identity', 'Type line', 'Pricing/rarity', 'Duplicate entries', 'Other'],
    },
    {
      kind: 'textarea',
      id: 'description',
      label: "What's wrong? Describe it in your own words",
      required: true,
    },
    {
      kind: 'attachments',
      id: 'evidence',
      label: 'Optional: screenshot showing the problem',
    },
    {
      kind: 'urlList',
      id: 'external_refs',
      label: 'Links to sources that have the correct data (optional)',
    },
  ],
}
