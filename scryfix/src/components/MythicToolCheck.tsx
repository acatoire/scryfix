import { useState } from 'react'
import type { ScryfallCard } from '../lib/scryfall'

interface MythicToolCheckProps {
  card: ScryfallCard
}

// Best-effort deep link written from memory, not verified against the live site (see ai/decisions.md).
function mythicToolSearchUrl(card: ScryfallCard): string {
  return `https://mythic.tool/?q=${encodeURIComponent(card.name)}`
}

// Phase 3 item 6: lets the user check whether the issue is already fixed on mythic.tool before reporting it.
function MythicToolCheck({ card }: MythicToolCheckProps) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="mythic-tool-check">
      <label>
        <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        Also search this card on mythic.tool
      </label>
      {checked && (
        <p>
          <a href={mythicToolSearchUrl(card)} target="_blank" rel="noreferrer">
            Search {card.name} on mythic.tool
          </a>
        </p>
      )}
    </div>
  )
}

export default MythicToolCheck
