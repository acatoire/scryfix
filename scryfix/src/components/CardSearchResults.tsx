import { cardImageUris, type ScryfallCard } from '../lib/scryfall'
import './CardSearchResults.css'

interface CardSearchResultsProps {
  cards: ScryfallCard[]
  onSelect: (card: ScryfallCard) => void
}

function CardSearchResults({ cards, onSelect }: CardSearchResultsProps) {
  return (
    <ul className="card-search-results">
      {cards.map((card) => {
        const image = cardImageUris(card)
        return (
          <li key={card.id}>
            <button type="button" onClick={() => onSelect(card)}>
              {image && <img src={image.small} alt="" width={64} height={89} />}
              <span>
                <strong>{card.name}</strong>
                <br />
                {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number} ·{' '}
                {card.lang}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default CardSearchResults
