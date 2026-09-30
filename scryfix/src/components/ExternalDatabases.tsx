import { useState } from 'react'
import { EXTERNAL_DATABASES } from '../data/externalDatabases'
import type { ScryfallCard } from '../lib/scryfall'

interface ExternalDatabasesProps {
  card: ScryfallCard
}

// Compare tool: tick the databases to check, then open each one's search for this card — lets the
// user see whether the issue is already fixed elsewhere before reporting it (phase 3 items 6 and 9).
function ExternalDatabases({ card }: ExternalDatabasesProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const chosen = EXTERNAL_DATABASES.filter((db) => selected.has(db.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <fieldset className="external-databases">
      <legend>Also check this card on other databases</legend>
      {EXTERNAL_DATABASES.map((db) => (
        <label key={db.id} className="external-databases-option">
          <input type="checkbox" checked={selected.has(db.id)} onChange={() => toggle(db.id)} />
          {db.name}
        </label>
      ))}
      {chosen.length > 0 && (
        <>
          <ul>
            {chosen.map((db) => (
              <li key={db.id}>
                <a href={db.searchUrl(card)} target="_blank" rel="noreferrer">
                  Search {card.name} on {db.name}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => chosen.forEach((db) => window.open(db.searchUrl(card), '_blank', 'noopener,noreferrer'))}
          >
            Open all selected
          </button>
        </>
      )}
    </fieldset>
  )
}

export default ExternalDatabases
