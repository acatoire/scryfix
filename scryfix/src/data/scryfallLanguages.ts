// Static mirror of Scryfall's documented language list — refreshed occasionally by hand,
// no need for a live call each time. https://scryfall.com/docs/api/languages
export interface ScryfallLanguage {
  code: string
  name: string
}

export const SCRYFALL_LANGUAGES: ScryfallLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese (Brazil)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'zhs', name: 'Chinese Simplified' },
  { code: 'zht', name: 'Chinese Traditional' },
  { code: 'he', name: 'Hebrew' },
  { code: 'la', name: 'Latin' },
  { code: 'grc', name: 'Ancient Greek' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'ph', name: 'Phyrexian' },
]
