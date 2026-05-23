import { useState, useEffect, useRef } from 'react'
import '../../styles/infotooltip.css'

export default function InfoTooltip({ testo }) {
  const [aperto, setAperto] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const popRef = useRef(null)

  const apri = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const popW = 260
    const popH = 220 // stima altezza massima
    const margin = 8
    let left = r.left + r.width / 2 - popW / 2
    if (left < margin) left = margin
    if (left + popW > window.innerWidth - margin) left = window.innerWidth - popW - margin
    // se non c'è spazio sotto, apri sopra
    const spazioSotto = window.innerHeight - r.bottom - margin
    const top = spazioSotto >= popH ? r.bottom + 8 : r.top - popH - 8
    setPos({ top, left })
    setAperto(v => !v)
  }

  useEffect(() => {
    if (!aperto) return
    const chiudi = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        popRef.current && !popRef.current.contains(e.target)
      ) setAperto(false)
    }
    document.addEventListener('mousedown', chiudi)
    document.addEventListener('touchstart', chiudi)
    return () => {
      document.removeEventListener('mousedown', chiudi)
      document.removeEventListener('touchstart', chiudi)
    }
  }, [aperto])

  return (
    <span className="info-tooltip">
      <button
        ref={btnRef}
        className="info-tooltip__btn"
        onClick={apri}
        aria-label="Informazioni"
        type="button"
      >?</button>
      {aperto && (
        <div
          ref={popRef}
          className="info-tooltip__popover"
          style={{ top: pos.top, left: pos.left }}
        >
          {testo}
        </div>
      )}
    </span>
  )
}
