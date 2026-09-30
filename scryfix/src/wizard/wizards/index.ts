import type { WizardConfig } from '../types'
import { missingImageLanguageWizard } from './missingImageLanguage'
import { otherWizard } from './other'
import { unlistedPrintingWizard } from './unlistedPrinting'
import { wrongImageLanguageWizard } from './wrongImageLanguage'

export const WIZARDS: WizardConfig[] = [
  missingImageLanguageWizard,
  wrongImageLanguageWizard,
  unlistedPrintingWizard,
  otherWizard,
]

export function getWizard(id: string): WizardConfig | undefined {
  return WIZARDS.find((wizard) => wizard.id === id)
}
