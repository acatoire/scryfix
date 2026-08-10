// Minimal Scryfall API client: rate-limited fetch + URL parsing + search/lookup helpers.
// https://scryfall.com/docs/api

import { SCRYFALL_LANGUAGES } from '../data/scryfallLanguages'

export interface ScryfallCard {
  id: string
  name: string
  lang: string
  set: string
  set_name: string
  collector_number: string
  released_at: string
  layout: string
  scryfall_uri: string
  prints_search_uri: string
  image_uris?: ScryfallImageUris
  card_faces?: Array<{ image_uris?: ScryfallImageUris; name: string }>
}

export interface ScryfallImageUris {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

export interface ScryfallList<T> {
  object: 'list'
  total_cards?: number
  has_more: boolean
  next_page?: string
  data: T[]
}

export interface ScryfallErrorBody {
  object: 'error'
  code: string
  status: number
  details: string
}

export class ScryfallApiError extends Error {
  code: string
  status: number

  constructor(body: ScryfallErrorBody) {
    super(body.details)
    this.code = body.code
    this.status = body.status
  }
}

const API_BASE = 'https://api.scryfall.com'

// Hard rate limits per https://scryfall.com/docs/api/rate-limits (full breakdown, CORS/CSP notes,
// and the not-yet-needed /cards/manifest bucket: doc/scryfall-integration.md):
// /cards/search, /cards/named, /cards/random, /cards/collection -> 2/sec (500ms)
// everything else -> 10/sec (100ms)
type Bucket = 'throttled' | 'default'

const BUCKET_INTERVAL_MS: Record<Bucket, number> = {
  throttled: 500,
  default: 100,
}

const lastCallAt: Record<Bucket, number> = { throttled: 0, default: 0 }
const queue: Record<Bucket, Promise<void>> = {
  throttled: Promise.resolve(),
  default: Promise.resolve(),
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function throttle(bucket: Bucket): Promise<void> {
  const next = queue[bucket].then(async () => {
    const wait = lastCallAt[bucket] + BUCKET_INTERVAL_MS[bucket] - Date.now()
    if (wait > 0) await sleep(wait)
    lastCallAt[bucket] = Date.now()
  })
  queue[bucket] = next
  return next
}

async function scryfallFetchUrl<T>(url: string, bucket: Bucket): Promise<T> {
  await throttle(bucket)
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  const body = await response.json()
  if (!response.ok || body.object === 'error') {
    throw new ScryfallApiError(body as ScryfallErrorBody)
  }
  return body as T
}

function scryfallFetch<T>(path: string, bucket: Bucket): Promise<T> {
  return scryfallFetchUrl<T>(`${API_BASE}${path}`, bucket)
}

export interface ParsedScryfallUrl {
  set: string
  number: string
  lang?: string
}

// Canonical shape is /card/{set}/{number}(/{lang})?(/{slug})?(?query|#fragment)? — but Scryfall
// omits the lang segment entirely for English printings, so a bare slug can immediately follow
// the number (e.g. /card/woe/287/decadent-dragon-expensive-taste has no lang segment at all).
// The only reliable way to tell a lang segment from a slug is to check it against the real list
// of language codes, not just "2-3 lowercase letters" (a slug can coincidentally be that short).
const SCRYFALL_CARD_URL_RE = /^https?:\/\/(?:www\.)?scryfall\.com\/card\/([a-z0-9]+)\/([^/?#]+)(\/[^?#]*)?(?:[?#].*)?$/i
const SCRYFALL_LANGUAGE_CODES = new Set(SCRYFALL_LANGUAGES.map((lang) => lang.code))

export function parseScryfallUrl(input: string): ParsedScryfallUrl | null {
  const match = SCRYFALL_CARD_URL_RE.exec(input.trim())
  if (!match) return null
  const [, set, number, rest] = match
  const firstSegment = rest?.split('/').filter(Boolean)[0]
  const lang = firstSegment && SCRYFALL_LANGUAGE_CODES.has(firstSegment.toLowerCase())
    ? firstSegment.toLowerCase()
    : undefined
  return {
    set: set.toLowerCase(),
    number: decodeURIComponent(number),
    lang,
  }
}

export function getCardByUrl(url: string): Promise<ScryfallCard> {
  const parsed = parseScryfallUrl(url)
  if (!parsed) throw new Error('Not a recognized Scryfall card URL.')
  return getCardBySetNumberLang(parsed.set, parsed.number, parsed.lang)
}

export function getCardBySetNumberLang(
  set: string,
  number: string,
  lang?: string,
): Promise<ScryfallCard> {
  const path = lang
    ? `/cards/${set}/${number}/${lang}`
    : `/cards/${set}/${number}`
  return scryfallFetch<ScryfallCard>(path, 'default')
}

export function searchCards(query: string): Promise<ScryfallList<ScryfallCard>> {
  // Scryfall's default search only matches English names; without `lang:`, a foreign printed
  // name (e.g. "Ange de miséricorde") returns no results at all. Opt in to all languages unless
  // the caller already specified one.
  const effectiveQuery = /\blang:/i.test(query) ? query : `${query} lang:any`
  return scryfallFetch<ScryfallList<ScryfallCard>>(
    `/cards/search?q=${encodeURIComponent(effectiveQuery)}`,
    'throttled',
  )
}

export function cardImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris
}

// A name search collapses to one printing per card by default (Scryfall's `unique=cards` behavior),
// so a card's other set versions have to be fetched separately via its own prints_search_uri.
export async function getCardPrints(card: ScryfallCard): Promise<ScryfallCard[]> {
  const result = await scryfallFetchUrl<ScryfallList<ScryfallCard>>(
    card.prints_search_uri,
    'throttled',
  )
  return [...result.data].sort((a, b) => b.released_at.localeCompare(a.released_at))
}

// All language printings of one specific set + collector number (e.g. every translation of "10e #2").
export async function getCardLanguages(card: ScryfallCard): Promise<ScryfallCard[]> {
  const query = `set:${card.set} cn:${card.collector_number} lang:any`
  const result = await scryfallFetch<ScryfallList<ScryfallCard>>(
    `/cards/search?q=${encodeURIComponent(query)}&unique=prints`,
    'throttled',
  )
  // `cn:` matches loosely (e.g. `cn:2` also returns the foil `2★` variant), so pin to an exact match.
  const exact = result.data.filter((printing) => printing.collector_number === card.collector_number)
  const byLang = new Map<string, ScryfallCard>()
  for (const printing of exact.length > 0 ? exact : result.data) {
    if (!byLang.has(printing.lang)) byLang.set(printing.lang, printing)
  }
  // Guarantee the card we were asked about is always a selectable option, even if the search
  // response happened to surface a different (but equivalent) object for its language.
  byLang.set(card.lang, card)
  return [...byLang.values()].sort((a, b) => a.lang.localeCompare(b.lang))
}
