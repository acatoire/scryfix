import type { ScryfallCard } from '../lib/scryfall'

export function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'card-1',
    name: 'Cold-Eyed Selkie',
    lang: 'en',
    set: 'afc',
    set_name: 'Foundations Commander',
    collector_number: '183',
    released_at: '2024-01-01',
    layout: 'normal',
    scryfall_uri: 'https://scryfall.com/card/afc/183/cold-eyed-selkie',
    prints_search_uri: 'https://api.scryfall.com/cards/search?q=oracleid%3Axyz&unique=prints',
    image_uris: {
      small: 'https://example.com/small.png',
      normal: 'https://example.com/normal.png',
      large: 'https://example.com/large.png',
      png: 'https://example.com/full.png',
      art_crop: 'https://example.com/art.png',
      border_crop: 'https://example.com/border.png',
    },
    ...overrides,
  }
}
