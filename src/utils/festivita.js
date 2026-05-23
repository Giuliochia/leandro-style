// Festività italiane fisse + festa patronale (29 agosto)
// Pasqua e Pasquetta vanno aggiunte manualmente come blocchi

const FESTIVITA_FISSE = [
  { mese: 1,  giorno: 1,  nome: 'Capodanno' },
  { mese: 1,  giorno: 6,  nome: 'Epifania' },
  { mese: 4,  giorno: 25, nome: 'Festa della Liberazione' },
  { mese: 5,  giorno: 1,  nome: 'Festa dei Lavoratori' },
  { mese: 6,  giorno: 2,  nome: 'Festa della Repubblica' },
  { mese: 8,  giorno: 15, nome: 'Ferragosto' },
  { mese: 8,  giorno: 29, nome: 'Festa Patronale' },
  { mese: 11, giorno: 1,  nome: 'Ognissanti' },
  { mese: 12, giorno: 8,  nome: 'Immacolata Concezione' },
  { mese: 12, giorno: 25, nome: 'Natale' },
  { mese: 12, giorno: 26, nome: 'Santo Stefano' },
]

// Controlla se una data è festività fissa
export function isFestivita(data) {
  const m = data.getMonth() + 1
  const g = data.getDate()
  return FESTIVITA_FISSE.find(f => f.mese === m && f.giorno === g) || null
}

// Restituisce il nome della festività o null
export function nomeFestivita(data) {
  const f = isFestivita(data)
  return f ? f.nome : null
}

// Formato chiave per confronto date (yyyy-MM-dd)
export function dataKey(data) {
  const d = new Date(data)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
