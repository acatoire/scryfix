import { useEffect, useState } from 'react'
import { cardImageUris, getCardLanguages, type ScryfallCard } from '../lib/scryfall'

interface LanguagePreviewProps {
  card: ScryfallCard
  language: string | undefined
}

// Keyed by card so a still-in-flight fetch for a previous card can't render as this card's
// result — setState only ever happens inside the promise callbacks, never synchronously in the
// effect body itself.
function LanguagePreview({ card, language }: LanguagePreviewProps) {
  const [preview, setPreview] = useState<{ card: ScryfallCard; languages: ScryfallCard[] } | null>(null)

  useEffect(() => {
    getCardLanguages(card)
      .then((languages) => setPreview({ card, languages }))
      .catch(() => setPreview({ card, languages: [] }))
  }, [card])

  const languages = preview && preview.card === card ? preview.languages : null
  const selectedPrinting = language ? languages?.find((printing) => printing.lang === language) : undefined
  const previewImage = selectedPrinting ? cardImageUris(selectedPrinting) : undefined

  return (
    <div className="wizard-language-preview">
      {!language ? (
        <p className="wizard-language-preview-missing">Pick a language above to preview its image.</p>
      ) : previewImage ? (
        <img src={previewImage.normal} alt={`${card.name} — ${language}`} width={180} height={251} />
      ) : languages === null ? (
        <p className="github-connect-hint">Loading preview…</p>
      ) : (
        <p className="wizard-language-preview-missing">
          No image found on Scryfall for this language — that may be exactly the bug you're reporting.
        </p>
      )}
    </div>
  )
}

export default LanguagePreview
