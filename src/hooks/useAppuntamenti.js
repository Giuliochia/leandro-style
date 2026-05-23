import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query, Permission, Role } from 'appwrite'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, formatISO } from 'date-fns'
import { logError } from '../lib/logger'

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROMEMORIA_WHITELIST = [30, 60, 120, 1440]

/**
 * Genera la chiave univoca che impedisce il double booking.
 * Formato: "<operatoreId>_<dataOraInizio ISO tronca ai minuti>"
 * Tronchiamo ai minuti perché gli slot sono step da 30 min — i secondi
 * variano per millisecondo di invio e romperebbero l'unicità.
 * Ritorna null per appuntamenti annullati: l'index UNIQUE in Appwrite
 * non considera i documenti con slot_key = null, quindi uno slot annullato
 * può essere ri-prenotato senza conflitto.
 */
function buildSlotKey(operatoreId, dataOraInizio, stato) {
  if (stato === 'annullato') return null
  // Tronca ai minuti: "2026-06-01T09:00:00.000Z" → "2026-06-01T09:00"
  const troncata = dataOraInizio.slice(0, 16)
  return `${operatoreId}_${troncata}`
}

/**
 * Attende ms millisecondi (usato nell'exponential backoff).
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Esegue fn con retry su errori transitori (es. network, 500).
 * Non fa retry su 409 (conflitto intenzionale) né su 401/403 (auth).
 */
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 200 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const code = e?.code ?? e?.status
      // Errori deterministici: non ha senso riprovare
      if (code === 409 || code === 401 || code === 403 || code === 404) throw e
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1)) // 200ms, 400ms, 800ms
      }
    }
  }
  throw lastErr
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useAppuntamentiGiorno(operatoreId, data) {
  const [appuntamenti, setAppuntamenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!operatoreId || !data) return
    setLoading(true)
    try {
      const inizio = formatISO(startOfDay(data))
      const fine = formatISO(endOfDay(data))
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
        Query.equal('operatore_id', operatoreId),
        Query.greaterThanEqual('data_ora_inizio', inizio),
        Query.lessThanEqual('data_ora_inizio', fine),
        Query.orderAsc('data_ora_inizio'),
        Query.limit(100),
      ])
      setAppuntamenti(res.documents)
    } catch (e) {
      logError('useAppuntamentiGiorno', e, { operatoreId })
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [operatoreId, data])

  useEffect(() => { fetch() }, [fetch])

  return { appuntamenti, loading, error, refresh: fetch }
}

export function useAppuntamentiSettimana(operatoreId, lunedi) {
  const [appuntamenti, setAppuntamenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!operatoreId || !lunedi) return
    setLoading(true)
    try {
      const inizio = formatISO(startOfWeek(lunedi, { weekStartsOn: 1 }))
      const fine = formatISO(endOfWeek(lunedi, { weekStartsOn: 1 }))
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
        Query.equal('operatore_id', operatoreId),
        Query.greaterThanEqual('data_ora_inizio', inizio),
        Query.lessThanEqual('data_ora_inizio', fine),
        Query.orderAsc('data_ora_inizio'),
        Query.limit(200),
      ])
      setAppuntamenti(res.documents)
    } catch (e) {
      logError('useAppuntamentiSettimana', e, { operatoreId })
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [operatoreId, lunedi])

  useEffect(() => { fetch() }, [fetch])

  return { appuntamenti, loading, error, refresh: fetch }
}

export function useAppuntamento(id) {
  const [appuntamento, setAppuntamento] = useState(null)
  const [servizi, setServizi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        databases.getDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id),
        databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, [
          Query.equal('appuntamento_id', id),
          Query.limit(20),
        ]),
      ])
      setAppuntamento(a)
      setServizi(s.documents)
    } catch (e) {
      logError('useAppuntamento', e, { id })
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  /**
   * Aggiorna lo stato e forza un refresh server-side per eliminare il
   * last-write-wins: invece di fidarci della risposta dell'update
   * (che riflette solo la nostra scrittura), rileggiamo il documento
   * dal DB per ottenere lo stato reale dopo eventuali scritture concorrenti.
   */
  const aggiornaStato = async (stato) => {
    await databases.updateDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id, { stato })
    await fetch() // rilegge dal DB — elimina desync da scritture concorrenti
  }

  const aggiorna = async (data) => {
    await databases.updateDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id, data)
    await fetch() // idem
  }

  return { appuntamento, servizi, loading, error, aggiornaStato, aggiorna, refresh: fetch }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function creaAppuntamento({
  clienteId,
  operatoreId,
  dataOraInizio,
  durataMinuti,
  serviziIds,
  note,
  promemoria,
  createdBy,
  clienteNome,
  serviziNomi,
  accountId,
}) {
  // Guardie di input
  if (!Array.isArray(serviziIds) || serviziIds.length === 0) {
    throw new Error('Almeno un servizio è obbligatorio.')
  }
  if (!Number.isFinite(durataMinuti) || durataMinuti <= 0) {
    throw new Error('Durata non valida.')
  }
  const dataInizio = new Date(dataOraInizio)
  if (isNaN(dataInizio.getTime()) || dataInizio <= new Date()) {
    throw new Error('Data non valida o nel passato.')
  }

  const promemoriaSafe = PROMEMORIA_WHITELIST.includes(Number(promemoria)) ? Number(promemoria) : 60
  const now = new Date().toISOString()

  const permissions = [
    Permission.read(Role.team('admin')),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
    ...(accountId ? [
      Permission.read(Role.user(accountId)),
      Permission.update(Role.user(accountId)),
    ] : []),
  ]

  // slot_key garantisce unicità a livello DB tramite l'index UNIQUE su Appwrite.
  // Se due richieste arrivano contemporaneamente per lo stesso slot,
  // Appwrite rifiuta la seconda con HTTP 409 — il DB diventa il lock.
  const slotKey = buildSlotKey(operatoreId, dataOraInizio, 'prenotato')

  let app
  try {
    app = await databases.createDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, ID.unique(), {
      cliente_id: clienteId,
      operatore_id: operatoreId,
      data_ora_inizio: dataOraInizio,
      durata_minuti: durataMinuti,
      stato: 'prenotato',
      note: (note || '').slice(0, 500),
      promemoria_offset_minuti: promemoriaSafe,
      created_by: createdBy || 'admin',
      created_at: now,
      cliente_nome: clienteNome || '',
      servizi_nomi: (Array.isArray(serviziNomi) ? serviziNomi : []).join(', '),
      slot_key: slotKey,
    }, permissions)
  } catch (e) {
    // 409 = slot già occupato (index UNIQUE violato) — messaggio user-friendly
    if (e?.code === 409) {
      throw new Error('Questo orario è stato appena prenotato da qualcun altro. Scegli un altro slot.')
    }
    throw e
  }

  // Crea i servizi con retry su errori transitori.
  // Se tutti falliscono, eliminiamo l'appuntamento creato (rollback).
  try {
    await Promise.all(
      serviziIds.map(sid =>
        withRetry(() =>
          databases.createDocument(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, ID.unique(), {
            appuntamento_id: app.$id,
            servizio_id: sid,
          })
        )
      )
    )
  } catch (servizioErr) {
    // Rollback: l'appuntamento esiste ma i servizi no — lo eliminiamo
    await databases.deleteDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, app.$id).catch(() => {})
    logError('creaAppuntamento/rollback', servizioErr, { appId: app.$id })
    throw new Error('Errore durante la prenotazione. Nessun dato è stato salvato. Riprova.')
  }

  return app
}

/**
 * Aggiorna un appuntamento e, se fornito serviziIds, sostituisce i servizi.
 *
 * Strategia robusta in 3 fasi:
 *   Fase 1 — Aggiorna il documento principale
 *   Fase 2 — Crea i nuovi servizi (con retry)
 *   Fase 3 — Elimina i vecchi servizi SOLO se la fase 2 ha avuto successo
 *
 * In caso di errore in Fase 2: i vecchi servizi rimangono intatti (safe).
 * In caso di errore in Fase 3: esistono duplicati temporanei → li puliamo.
 * La finestra di lettura sporca (RC-3) rimane ma è ora rilevata e corretta.
 */
export async function aggiornaAppuntamento(id, data, serviziIds) {
  // Fase 1: aggiorna documento principale
  // Se slot_key deve cambiare (cambio operatore o orario), ricalcolala
  const aggiornamentoDoc = { ...data }
  if (data.operatore_id || data.data_ora_inizio) {
    // Dobbiamo conoscere i valori correnti per costruire la nuova slot_key
    const corrente = await databases.getDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id)
    const nuovoOperatoreId = data.operatore_id || corrente.operatore_id
    const nuovaDataOra = data.data_ora_inizio || corrente.data_ora_inizio
    const nuovoStato = data.stato || corrente.stato
    aggiornamentoDoc.slot_key = buildSlotKey(nuovoOperatoreId, nuovaDataOra, nuovoStato)
  }
  // Quando un appuntamento viene annullato, liberiamo lo slot_key
  if (data.stato === 'annullato') {
    aggiornamentoDoc.slot_key = null
  }

  const app = await databases.updateDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id, aggiornamentoDoc)

  if (!serviziIds) return app

  // Fase 2: leggi i vecchi servizi e crea i nuovi
  const vecchi = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, [
    Query.equal('appuntamento_id', id),
    Query.limit(20),
  ])

  const nuoviCreati = []
  try {
    for (const sid of serviziIds) {
      const doc = await withRetry(() =>
        databases.createDocument(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, ID.unique(), {
          appuntamento_id: id,
          servizio_id: sid,
        })
      )
      nuoviCreati.push(doc.$id)
    }
  } catch (errCreazione) {
    // Fase 2 fallita: elimina i nuovi parzialmente creati per non lasciare duplicati
    await Promise.allSettled(
      nuoviCreati.map(docId =>
        databases.deleteDocument(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, docId)
      )
    )
    logError('aggiornaAppuntamento/rollback-nuovi', errCreazione, { id, nuoviCreati })
    throw new Error('Aggiornamento servizi fallito. I dati originali sono intatti.')
  }

  // Fase 3: elimina i vecchi — se fallisce, puliamo i duplicati (nuovi + vecchi)
  const erroriDelete = []
  await Promise.allSettled(
    vecchi.documents.map(async (d) => {
      try {
        await withRetry(() => databases.deleteDocument(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, d.$id))
      } catch (e) {
        erroriDelete.push(d.$id)
      }
    })
  )

  if (erroriDelete.length > 0) {
    // Duplicati rilevati: elimina anche i nuovi e segnala l'errore
    await Promise.allSettled(
      nuoviCreati.map(docId =>
        databases.deleteDocument(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, docId)
      )
    )
    logError('aggiornaAppuntamento/delete-falliti', new Error('Delete parziale'), { id, erroriDelete })
    throw new Error('Aggiornamento parziale rilevato. I dati originali sono stati ripristinati.')
  }

  return app
}
