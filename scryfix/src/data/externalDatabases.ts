import type { ScryfallCard } from '../lib/scryfall'

// Other card databases a user can check to see whether an issue is already fixed there
// (phase 3 items 6 and 9). Search URLs are best-effort deep links built from the card name —
// adding a database is one entry here, no UI change.
export interface ExternalDatabase {
  id: string
  name: string
  searchUrl: (card: ScryfallCard) => string
}

export const EXTERNAL_DATABASES: ExternalDatabase[] = [
  {
    id: 'mythic-tool',
    name: 'mythic.tool',
    searchUrl: (card) => `https://mythic.tool/?q=${encodeURIComponent(card.name)}`,
  },
  {
    id: 'gatherer',
    name: 'Gatherer (Wizards)',
    searchUrl: (card) => `https://gatherer.wizards.com/advanced-search?name=${encodeURIComponent(card.name)}`,
  },
  {
    id: 'cardmarket',
    name: 'Cardmarket',
    searchUrl: (card) =>
      `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`,
  },
]
