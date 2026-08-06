import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cardImageUris, parseScryfallUrl, type ScryfallCard } from './scryfall'

function jsonResponse(body: unknown, init?: { ok?: boolean }) {
  return {
    ok: init?.ok ?? true,
    json: async () => body,
  }
}

const cardFixture: ScryfallCard = {
  id: '1',
  name: 'Cold-Eyed Selkie',
  lang: 'en',
  set: 'afc',
  set_name: 'Foundations Commander',
  collector_number: '183',
  released_at: '2024-01-01',
  layout: 'normal',
  scryfall_uri: 'https://scryfall.com/card/afc/183',
  prints_search_uri: 'https://api.scryfall.com/cards/search?q=x',
  image_uris: {
    small: 'small.png',
    normal: 'normal.png',
    large: 'large.png',
    png: 'full.png',
    art_crop: 'art.png',
    border_crop: 'border.png',
  },
}

describe('parseScryfallUrl', () => {
  it('parses a full canonical url with lang and slug', () => {
    expect(parseScryfallUrl('https://scryfall.com/card/afc/183/en/cold-eyed-selkie')).toEqual({
      set: 'afc',
      number: '183',
      lang: 'en',
    })
  })

  it('parses a url without a slug', () => {
    expect(parseScryfallUrl('https://scryfall.com/card/afc/183/fr')).toEqual({
      set: 'afc',
      number: '183',
      lang: 'fr',
    })
  })

  it('parses a url without a lang or slug', () => {
    expect(parseScryfallUrl('https://scryfall.com/card/mh2/1')).toEqual({
      set: 'mh2',
      number: '1',
      lang: undefined,
    })
  })

  it('lowercases set and lang, but not the collector number', () => {
    const parsed = parseScryfallUrl('https://scryfall.com/card/AFC/183/EN')
    expect(parsed).toEqual({ set: 'afc', number: '183', lang: 'en' })
  })

  it('decodes a url-encoded collector number', () => {
    expect(parseScryfallUrl('https://scryfall.com/card/sld/%E2%98%85')).toEqual({
      set: 'sld',
      number: '★',
      lang: undefined,
    })
  })

  it('ignores query strings and fragments', () => {
    expect(parseScryfallUrl('https://scryfall.com/card/afc/183/en?utm_source=x')).toEqual({
      set: 'afc',
      number: '183',
      lang: 'en',
    })
  })

  it('parses an English url whose slug directly follows the number, with no lang segment', () => {
    // Scryfall omits the lang segment entirely for English printings.
    expect(
      parseScryfallUrl('https://scryfall.com/card/woe/287/decadent-dragon-expensive-taste'),
    ).toEqual({ set: 'woe', number: '287', lang: undefined })
  })

  it('parses a lang segment followed by a slug', () => {
    expect(
      parseScryfallUrl('https://scryfall.com/card/10e/2/fr/ange-de-mis%C3%A9ricorde-(angel-of-mercy)'),
    ).toEqual({ set: '10e', number: '2', lang: 'fr' })
  })

  it('does not mistake a short English slug for a lang code', () => {
    // "fog" is 3 lowercase letters (same shape as a lang code) but isn't one.
    expect(parseScryfallUrl('https://scryfall.com/card/tmp/61/fog')).toEqual({
      set: 'tmp',
      number: '61',
      lang: undefined,
    })
  })

  it('handles a slug with a trailing query string and no lang segment', () => {
    expect(
      parseScryfallUrl('https://scryfall.com/card/woe/287/decadent-dragon-expensive-taste?utm_source=api'),
    ).toEqual({ set: 'woe', number: '287', lang: undefined })
  })

  it('returns null for a non-Scryfall url', () => {
    expect(parseScryfallUrl('https://example.com/card/afc/183')).toBeNull()
  })

  it('returns null for plain search text', () => {
    expect(parseScryfallUrl('Lightning Bolt')).toBeNull()
  })
})

describe('cardImageUris', () => {
  it('returns the card-level image_uris when present', () => {
    expect(cardImageUris(cardFixture)).toBe(cardFixture.image_uris)
  })

  it('falls back to the first face image_uris for double-faced cards', () => {
    const faceImages = { ...cardFixture.image_uris! , small: 'face-small.png' }
    const dfc: ScryfallCard = {
      ...cardFixture,
      image_uris: undefined,
      card_faces: [{ name: 'Front', image_uris: faceImages }, { name: 'Back' }],
    }
    expect(cardImageUris(dfc)).toBe(faceImages)
  })

  it('returns undefined when no image is available anywhere', () => {
    const noImage: ScryfallCard = { ...cardFixture, image_uris: undefined }
    expect(cardImageUris(noImage)).toBeUndefined()
  })
})

describe('API calls', () => {
  async function freshScryfall() {
    vi.resetModules()
    return import('./scryfall')
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches by set/number/lang at the expected path', async () => {
    const { getCardBySetNumberLang } = await freshScryfall()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(cardFixture))
    vi.stubGlobal('fetch', fetchMock)

    const card = await getCardBySetNumberLang('afc', '183', 'en')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/afc/183/en',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
    expect(card).toEqual(cardFixture)
  })

  it('omits the lang segment when no lang is given', async () => {
    const { getCardBySetNumberLang } = await freshScryfall()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(cardFixture))
    vi.stubGlobal('fetch', fetchMock)

    await getCardBySetNumberLang('afc', '183')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/afc/183',
      expect.anything(),
    )
  })

  it('url-encodes the search query and opts in to all languages', async () => {
    const { searchCards } = await freshScryfall()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await searchCards('lightning bolt')

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent('lightning bolt lang:any')}`,
      expect.anything(),
    )
  })

  it('does not duplicate a lang: qualifier the caller already provided', async () => {
    const { searchCards } = await freshScryfall()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await searchCards('lightning bolt lang:fr')

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent('lightning bolt lang:fr')}`,
      expect.anything(),
    )
  })

  it('throws ScryfallApiError on a Scryfall error body', async () => {
    const { getCardBySetNumberLang, ScryfallApiError: FreshScryfallApiError } = await freshScryfall()
    const errorBody = { object: 'error', status: 404, code: 'not_found', details: 'No such card.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(errorBody, { ok: false })))

    await expect(getCardBySetNumberLang('afc', '999')).rejects.toBeInstanceOf(FreshScryfallApiError)
    await expect(getCardBySetNumberLang('afc', '999')).rejects.toMatchObject({
      message: 'No such card.',
      code: 'not_found',
      status: 404,
    })
  })

  it('fetches all prints via the card prints_search_uri and sorts newest first', async () => {
    const { getCardPrints } = await freshScryfall()
    const older = { ...cardFixture, id: 'old', set: 'lea', released_at: '1993-08-05' }
    const newer = { ...cardFixture, id: 'new', set: 'afc', released_at: '2024-11-15' }
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [older, newer] }))
    vi.stubGlobal('fetch', fetchMock)

    const prints = await getCardPrints(cardFixture)

    expect(fetchMock).toHaveBeenCalledWith(cardFixture.prints_search_uri, expect.anything())
    expect(prints.map((p) => p.id)).toEqual(['new', 'old'])
  })

  it('fetches languages for the exact set/collector-number and dedupes by lang', async () => {
    const { getCardLanguages } = await freshScryfall()
    const en = { ...cardFixture, id: 'en-1', lang: 'en', collector_number: '2' }
    const enFoilVariant = { ...cardFixture, id: 'en-2', lang: 'en', collector_number: '2★' }
    const fr = { ...cardFixture, id: 'fr-1', lang: 'fr', collector_number: '2' }
    const de = { ...cardFixture, id: 'de-1', lang: 'de', collector_number: '2' }
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [en, enFoilVariant, fr, de] }))
    vi.stubGlobal('fetch', fetchMock)

    const languages = await getCardLanguages(en)

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent('set:afc cn:2 lang:any')}&unique=prints`,
      expect.anything(),
    )
    // exact cn "2" match wins over the loosely-matched "2★" foil variant, and each lang appears once
    expect(languages.map((l) => [l.lang, l.id])).toEqual([
      ['de', 'de-1'],
      ['en', 'en-1'],
      ['fr', 'fr-1'],
    ])
  })

  it('always includes the requested card itself, even if the search response omits it', async () => {
    const { getCardLanguages } = await freshScryfall()
    const fr = { ...cardFixture, id: 'fr-1', lang: 'fr', collector_number: '2' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [fr] })),
    )

    const requested = { ...cardFixture, id: 'en-requested', lang: 'en', collector_number: '2' }
    const languages = await getCardLanguages(requested)

    expect(languages.find((l) => l.lang === 'en')).toEqual(requested)
  })

  it('rejects getCardByUrl for a non-Scryfall url without ever calling fetch', async () => {
    const { getCardByUrl } = await freshScryfall()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(() => getCardByUrl('not a url')).toThrow(/recognized Scryfall/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('rate limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('spaces two /cards/search calls (throttled bucket) by at least 500ms', async () => {
    vi.resetModules()
    const { searchCards } = await import('./scryfall')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ object: 'list', has_more: false, data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    void searchCards('a')
    void searchCards('b')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(499)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('spaces two default-bucket lookups by at least 100ms', async () => {
    vi.resetModules()
    const { getCardBySetNumberLang } = await import('./scryfall')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(cardFixture))
    vi.stubGlobal('fetch', fetchMock)

    void getCardBySetNumberLang('afc', '183')
    void getCardBySetNumberLang('mh2', '1')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(99)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
