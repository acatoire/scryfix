import { cardImageUris, type ScryfallCard } from '../lib/scryfall'
import './CardPreview.css'

interface CardPreviewProps {
  card: ScryfallCard
  prints?: ScryfallCard[]
  languages?: ScryfallCard[]
  onSelectPrint?: (card: ScryfallCard) => void
  onSelectLanguage?: (card: ScryfallCard) => void
  onClear?: () => void
  onConfirm?: (card: ScryfallCard) => void
}

function CardPreview({
  card,
  prints = [],
  languages = [],
  onSelectPrint,
  onSelectLanguage,
  onClear,
  onConfirm,
}: CardPreviewProps) {
  const image = cardImageUris(card)

  return (
    <div className="card-preview">
      {image && <img src={image.normal} alt={card.name} width={223} height={311} />}
      <div className="card-preview-info">
        <h2>{card.name}</h2>
        {(prints.length > 1 || languages.length > 1) && (
          <div className="card-preview-selects">
            {prints.length > 1 && onSelectPrint && (
              <label className="card-preview-select">
                Set Switch
                <select
                  value={card.id}
                  onChange={(event) => {
                    const next = prints.find((print) => print.id === event.target.value)
                    if (next) onSelectPrint(next)
                  }}
                >
                  {prints.map((print) => (
                    <option key={print.id} value={print.id}>
                      {print.set_name} ({print.set.toUpperCase()}) #{print.collector_number}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {languages.length > 1 && onSelectLanguage && (
              <label className="card-preview-select">
                Language Switch
                <select
                  value={card.id}
                  onChange={(event) => {
                    const next = languages.find((printing) => printing.id === event.target.value)
                    if (next) onSelectLanguage(next)
                  }}
                >
                  {languages.map((printing) => (
                    <option key={printing.id} value={printing.id}>
                      {printing.lang}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <dl>
          <dt>Set</dt>
          <dd>
            {card.set_name} ({card.set.toUpperCase()})
          </dd>
          <dt>Collector number</dt>
          <dd>{card.collector_number}</dd>
          <dt>Language</dt>
          <dd>{card.lang}</dd>
        </dl>
        <a href={card.scryfall_uri} target="_blank" rel="noreferrer">
          View on Scryfall
        </a>
        <div className="card-preview-actions">
          {onConfirm && (
            <button type="button" className="card-preview-confirm" onClick={() => onConfirm(card)}>
              Report an issue with this printing
            </button>
          )}
          {onClear && (
            <button type="button" onClick={onClear}>
              Look up a different card
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CardPreview
