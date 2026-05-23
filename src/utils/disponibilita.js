import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { Query } from 'appwrite'
import { getDay, startOfDay, endOfDay, formatISO, addMinutes, isBefore, isAfter } from 'date-fns'
import { isFestivita, nomeFestivita, dataKey } from './festivita'

const SLOT_STEP_MINUTI = 30

// Carica le eccezioni di apertura (festività in cui si decide di aprire)
async function caricaEccezioniApertura() {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
      Query.equal('eccezione_apertura', true),
      Query.limit(50),
    ])
    return new Set(res.documents.map(b => dataKey(b.data_ora_inizio)))
  } catch {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [Query.limit(200)])
    return new Set(res.documents.filter(b => b.eccezione_apertura).map(b => dataKey(b.data_ora_inizio)))
  }
}

// Carica i giorni di chiusura ricorrenti
async function caricaGiorniChiusi() {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
      Query.equal('ricorrente', true),
      Query.limit(7),
    ])
    return new Set(res.documents.map(b => b.giorno_settimana))
  } catch {
    // Se ricorrente non è indicizzato, carica tutto e filtra lato client
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [Query.limit(200)])
    return new Set(res.documents.filter(b => b.ricorrente).map(b => b.giorno_settimana))
  }
}

// Ritorna gli slot disponibili per un operatore in una data data, per una durata richiesta
export async function calcolaSlotDisponibili(operatoreId, data, durataMinuti) {
  const giornoSettimana = getDay(data) // 0=Dom

  const [giorniChiusi, eccezioniApertura] = await Promise.all([
    caricaGiorniChiusi(),
    caricaEccezioniApertura(),
  ])
  const key = dataKey(data)

  // Controlla festività fisse (salvo eccezione apertura)
  if (isFestivita(data) && !eccezioniApertura.has(key)) return []

  // Controlla giorni chiusi ricorrenti (salvo eccezione apertura)
  if (giorniChiusi.has(giornoSettimana) && !eccezioniApertura.has(key)) return []

  // 1. Orari di lavoro del giorno (orari speciali per data hanno priorità)
  const resOrariAll = await databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
    Query.equal('operatore_id', operatoreId),
    Query.equal('giorno_settimana', giornoSettimana),
    Query.equal('attivo', true),
    Query.limit(20),
  ])
  const orariSpeciali = resOrariAll.documents.filter(o => o.data_specifica === key)
  const resOrari = {
    documents: orariSpeciali.length > 0
      ? orariSpeciali
      : resOrariAll.documents.filter(o => !o.data_specifica)
  }
  if (!resOrari.documents.length) return []

  // 2. Blocchi che coprono questa data (filtro lato client per operatore o tutto il salone)
  const dataISO = formatISO(startOfDay(data))
  const fineISO = formatISO(endOfDay(data))
  const resBlocchiRaw = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
    Query.lessThanEqual('data_ora_inizio', fineISO),
    Query.greaterThanEqual('data_ora_fine', dataISO),
    Query.limit(50),
  ])
  const resBlocchi = {
    documents: resBlocchiRaw.documents.filter(b =>
      b.operatore_id === operatoreId || b.tutto_salone === true || !b.operatore_id
    )
  }

  // 3. Appuntamenti attivi del giorno
  const resApp = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
    Query.equal('operatore_id', operatoreId),
    Query.greaterThanEqual('data_ora_inizio', dataISO),
    Query.lessThanEqual('data_ora_inizio', fineISO),
    Query.notEqual('stato', 'annullato'),
    Query.limit(100),
  ])

  // 4. Genera tutti gli slot da 30 min e filtra quelli liberi
  const slots = []
  const now = new Date()

  for (const orario of resOrari.documents) {
    const [hI, mI] = orario.ora_inizio.split(':').map(Number)
    const [hF, mF] = orario.ora_fine.split(':').map(Number)
    let cur = new Date(data)
    cur.setHours(hI, mI, 0, 0)
    const fine = new Date(data)
    fine.setHours(hF, mF, 0, 0)

    while (isBefore(cur, fine)) {
      const slotFine = addMinutes(cur, durataMinuti)

      // Lo slot deve stare interamente nella fascia
      if (isAfter(slotFine, fine)) break

      // Non nel passato
      if (isAfter(cur, now) || cur.getTime() === now.getTime()) {
        // Non coperto da blocco
        const bloccato = resBlocchi.documents.some(b => {
          const bI = new Date(b.data_ora_inizio)
          const bF = new Date(b.data_ora_fine)
          return isBefore(cur, bF) && isAfter(slotFine, bI)
        })

        if (!bloccato) {
          // Non sovrapposto ad appuntamenti esistenti
          const occupato = resApp.documents.some(a => {
            const aI = new Date(a.data_ora_inizio)
            const aF = addMinutes(aI, a.durata_minuti)
            return isBefore(cur, aF) && isAfter(slotFine, aI)
          })

          if (!occupato) {
            slots.push(new Date(cur))
          }
        }
      }

      cur = addMinutes(cur, SLOT_STEP_MINUTI)
    }
  }

  return slots.sort((a, b) => a - b)
}

// Ritorna i giorni bloccati (ferie/chiusure che coprono l'intero giorno lavorativo) nel range [da, a]
export async function calcolaGiorniBlocchi(operatoreId, durataMinuti, da, a) {
  const [giorniChiusi, eccezioniApertura] = await Promise.all([
    caricaGiorniChiusi(),
    caricaEccezioniApertura(),
  ])

  const resOrari = await databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
    Query.equal('operatore_id', operatoreId),
    Query.equal('attivo', true),
    Query.limit(20),
  ])
  const giorniLavorativi = new Set(resOrari.documents.map(o => o.giorno_settimana))

  const resBlocchiAll = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
    Query.lessThanEqual('data_ora_inizio', formatISO(endOfDay(a))),
    Query.greaterThanEqual('data_ora_fine', formatISO(startOfDay(da))),
    Query.limit(200),
  ])
  // Filtra lato client: blocchi per questo operatore o per tutto il salone
  const tuttiBlocchi = resBlocchiAll.documents.filter(b =>
    b.operatore_id === operatoreId || b.tutto_salone === true || !b.operatore_id
  )

  const bloccati = []
  let cur = new Date(da)
  cur.setHours(0, 0, 0, 0)

  while (!isAfter(cur, a)) {
    const giorno = getDay(cur)
    const key = dataKey(cur)
    const festivita = nomeFestivita(cur)
    const haEccezione = eccezioniApertura.has(key)
    if (festivita && !haEccezione) {
      bloccati.push({ data: new Date(cur), motivo: festivita })
    } else if (giorniChiusi.has(giorno) && !haEccezione) {
      bloccati.push({ data: new Date(cur), motivo: 'Chiuso' })
    } else if (giorniLavorativi.has(giorno)) {
      const orariGiorno = resOrari.documents.filter(o => o.giorno_settimana === giorno)
      // Controlla se tutti gli slot del giorno sono bloccati
      let tuttiBloccati = true
      outer: for (const orario of orariGiorno) {
        const [hI, mI] = orario.ora_inizio.split(':').map(Number)
        const [hF, mF] = orario.ora_fine.split(':').map(Number)
        let slot = new Date(cur); slot.setHours(hI, mI, 0, 0)
        const fine = new Date(cur); fine.setHours(hF, mF, 0, 0)
        while (isBefore(slot, fine)) {
          const slotFine = addMinutes(slot, durataMinuti)
          if (isAfter(slotFine, fine)) break
          const bloccato = tuttiBlocchi.some(b =>
            isBefore(slot, new Date(b.data_ora_fine)) && isAfter(slotFine, new Date(b.data_ora_inizio))
          )
          if (!bloccato) { tuttiBloccati = false; break outer }
          slot = addMinutes(slot, SLOT_STEP_MINUTI)
        }
      }
      if (tuttiBloccati) {
        const motivi = [...new Set(tuttiBlocchi
          .filter(b => isBefore(new Date(b.data_ora_inizio), endOfDay(cur)) && isAfter(new Date(b.data_ora_fine), startOfDay(cur)))
          .map(b => b.motivo).filter(Boolean)
        )]
        bloccati.push({ data: new Date(cur), motivo: motivi[0] || 'Chiuso' })
      }
    }
    cur = new Date(cur.getTime() + 86400000)
  }
  return bloccati
}

// Ritorna i giorni disponibili (hanno almeno 1 slot) nel range [da, a]
export async function calcolaGiorniDisponibili(operatoreId, durataMinuti, da, a) {
  const [giorniChiusi, eccezioniApertura] = await Promise.all([
    caricaGiorniChiusi(),
    caricaEccezioniApertura(),
  ])

  // Carica orari di lavoro una volta sola
  const resOrari = await databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
    Query.equal('operatore_id', operatoreId),
    Query.equal('attivo', true),
    Query.limit(20),
  ])
  const giorniLavorativi = new Set(resOrari.documents.map(o => o.giorno_settimana))

  // Blocchi nel range (filtro lato client per operatore o tutto il salone)
  const resBlocchiRaw = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
    Query.lessThanEqual('data_ora_inizio', formatISO(endOfDay(a))),
    Query.greaterThanEqual('data_ora_fine', formatISO(startOfDay(da))),
    Query.limit(200),
  ])
  const resBlocchi = {
    documents: resBlocchiRaw.documents.filter(b =>
      b.operatore_id === operatoreId || b.tutto_salone === true || !b.operatore_id
    )
  }

  // Appuntamenti nel range
  const resApp = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
    Query.equal('operatore_id', operatoreId),
    Query.greaterThanEqual('data_ora_inizio', formatISO(startOfDay(da))),
    Query.lessThanEqual('data_ora_inizio', formatISO(endOfDay(a))),
    Query.notEqual('stato', 'annullato'),
    Query.limit(500),
  ])

  const now = new Date()
  const disponibili = []
  let cur = new Date(da)
  cur.setHours(0, 0, 0, 0)

  while (!isAfter(cur, a)) {
    const giorno = getDay(cur)
    const haEccezione = eccezioniApertura.has(dataKey(cur))
    if ((isFestivita(cur) || giorniChiusi.has(giorno)) && !haEccezione) {
      // festività o giorno chiuso — salta
    } else if (giorniLavorativi.has(giorno) || haEccezione) {
      const curKey = dataKey(cur)
      const orariSpecialiCur = resOrari.documents.filter(o => o.data_specifica === curKey)
      const orariGiorno = orariSpecialiCur.length > 0
        ? orariSpecialiCur
        : resOrari.documents.filter(o => o.giorno_settimana === giorno && !o.data_specifica)
      if (!orariGiorno.length) { cur = new Date(cur.getTime() + 86400000); continue }
      const appGiorno = resApp.documents.filter(a =>
        a.data_ora_inizio.startsWith(formatISO(cur).slice(0, 10))
      )
      const blocchiGiorno = resBlocchi.documents

      // Verifica che ci sia almeno uno slot libero
      let haSlot = false
      outer: for (const orario of orariGiorno) {
        const [hI, mI] = orario.ora_inizio.split(':').map(Number)
        const [hF, mF] = orario.ora_fine.split(':').map(Number)
        let slot = new Date(cur)
        slot.setHours(hI, mI, 0, 0)
        const fine = new Date(cur)
        fine.setHours(hF, mF, 0, 0)

        while (isBefore(slot, fine)) {
          const slotFine = addMinutes(slot, durataMinuti)
          if (isAfter(slotFine, fine)) break

          if (!isAfter(now, slot)) {
            const bloccato = blocchiGiorno.some(b =>
              isBefore(slot, new Date(b.data_ora_fine)) && isAfter(slotFine, new Date(b.data_ora_inizio))
            )
            if (!bloccato) {
              const occupato = appGiorno.some(a => {
                const aI = new Date(a.data_ora_inizio)
                const aF = addMinutes(aI, a.durata_minuti)
                return isBefore(slot, aF) && isAfter(slotFine, aI)
              })
              if (!occupato) { haSlot = true; break outer }
            }
          }
          slot = addMinutes(slot, SLOT_STEP_MINUTI)
        }
      }

      if (haSlot) disponibili.push(new Date(cur))
    }
    cur = new Date(cur.getTime() + 86400000)
  }

  return disponibili
}
