import { useState, type FormEvent } from 'react'
import {
  ScryfallApiError,
  getCardByUrl,
  getCardLanguages,
  getCardPrints,
  parseScryfallUrl,
  searchCards,
  type ScryfallCard,
} from '../lib/scryfall'
import CardPreview from './CardPreview'
import CardSearchResults from './CardSearchResults'
import './CardLookup.css'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'results'; cards: ScryfallCard[] }
  | { kind: 'card'; card: ScryfallCard; prints: ScryfallCard[]; languages: ScryfallCard[] }

interface CardLookupProps {
  onCardConfirmed: (card: ScryfallCard) => void
}

function CardLookup({ onCardConfirmed }: CardLookupProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function loadLanguages(card: ScryfallCard) {
    try {
      const languages = await getCardLanguages(card)
      // Only apply if the selected set version is still the one we asked languages for.
      setStatus((prev) =>
        prev.kind === 'card' && prev.card.set === card.set && prev.card.collector_number === card.collector_number
          ? { ...prev, languages }
          : prev,
      )
    } catch {
      // Language dropdown just won't show; the single language already rendered.
    }
  }

  async function showCard(card: ScryfallCard) {
    setStatus({ kind: 'card', card, prints: [card], languages: [card] })
    void loadLanguages(card)
    try {
      const prints = await getCardPrints(card)
      // Keep whatever the user has selected in the meantime; only fill in the print list.
      setStatus((prev) => (prev.kind === 'card' && prev.card.name === card.name ? { ...prev, prints } : prev))
    } catch {
      // Set-version dropdown just won't show; the single print already rendered.
    }
  }

  function selectPrint(card: ScryfallCard) {
    setStatus((prev) => (prev.kind === 'card' ? { ...prev, card, languages: [card] } : prev))
    void loadLanguages(card)
  }

  function selectLanguage(card: ScryfallCard) {
    setStatus((prev) => (prev.kind === 'card' ? { ...prev, card } : prev))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return

    setStatus({ kind: 'loading' })
    try {
      if (parseScryfallUrl(value)) {
        const card = await getCardByUrl(value)
        await showCard(card)
      } else {
        const results = await searchCards(value)
        if (results.data.length === 1) {
          await showCard(results.data[0])
        } else {
          setStatus({ kind: 'results', cards: results.data })
        }
      }
    } catch (error) {
      const message =
        error instanceof ScryfallApiError
          ? error.message
          : 'Could not reach Scryfall. Please try again.'
      setStatus({ kind: 'error', message })
    }
  }

  function reset() {
    setQuery('')
    setStatus({ kind: 'idle' })
  }

  return (
    <div className="card-lookup">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Paste a Scryfall card URL, or search by name…"
        />
        <button type="submit" disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? 'Looking up…' : 'Look up'}
        </button>
      </form>
      <p className="card-lookup-hint">
        Enter any card name, or paste a Scryfall link for an exact match.
      </p>

      {status.kind === 'error' && <p className="card-lookup-error">{status.message}</p>}

      {status.kind === 'results' &&
        (status.cards.length === 0 ? (
          <p>No matching cards found.</p>
        ) : (
          <CardSearchResults cards={status.cards} onSelect={(card) => void showCard(card)} />
        ))}

      {status.kind === 'card' && (
        <CardPreview
          card={status.card}
          prints={status.prints}
          languages={status.languages}
          onSelectPrint={selectPrint}
          onSelectLanguage={selectLanguage}
          onClear={reset}
          onConfirm={onCardConfirmed}
        />
      )}
    </div>
  )
}

export default CardLookup
