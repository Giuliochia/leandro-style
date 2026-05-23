import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'

export function useBlocchi() {
  const [blocchi, setBlocchi] = useState([])
  const [blocchiRicorrenti, setBlocchiRicorrenti] = useState([])
  const [eccezioniApertura, setEccezioniApertura] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
        Query.orderAsc('data_ora_inizio'),
        Query.limit(200),
      ])
      setBlocchi(res.documents.filter(b => !b.ricorrente && !b.eccezione_apertura))
      setBlocchiRicorrenti(res.documents.filter(b => b.ricorrente))
      setEccezioniApertura(res.documents.filter(b => b.eccezione_apertura))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const crea = async (data) => {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.BLOCCHI, ID.unique(), data)
    setBlocchi(prev => [...prev, doc].sort((a, b) => new Date(a.data_ora_inizio) - new Date(b.data_ora_inizio)))
    return doc
  }

  const aggiorna = async (id, data) => {
    const doc = await databases.updateDocument(DB_ID, COLLECTIONS.BLOCCHI, id, data)
    setBlocchi(prev => prev.map(b => b.$id === id ? doc : b))
    return doc
  }

  const elimina = async (id) => {
    await databases.deleteDocument(DB_ID, COLLECTIONS.BLOCCHI, id)
    setBlocchi(prev => prev.filter(b => b.$id !== id))
  }

  const creaRicorrente = async (giornoSettimana, motivo = 'Chiuso') => {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.BLOCCHI, ID.unique(), {
      ricorrente: true,
      giorno_settimana: giornoSettimana,
      motivo,
      data_ora_inizio: new Date('2020-01-01').toISOString(),
      data_ora_fine: new Date('2099-12-31').toISOString(),
    })
    setBlocchiRicorrenti(prev => [...prev, doc])
    return doc
  }

  const eliminaRicorrente = async (id) => {
    await databases.deleteDocument(DB_ID, COLLECTIONS.BLOCCHI, id)
    setBlocchiRicorrenti(prev => prev.filter(b => b.$id !== id))
  }

  const creaEccezioneApertura = async (data, motivo = 'Aperto') => {
    const d = new Date(data)
    d.setHours(0, 0, 0, 0)
    const fine = new Date(data)
    fine.setHours(23, 59, 59, 999)
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.BLOCCHI, ID.unique(), {
      eccezione_apertura: true,
      motivo,
      data_ora_inizio: d.toISOString(),
      data_ora_fine: fine.toISOString(),
    })
    setEccezioniApertura(prev => [...prev, doc].sort((a, b) => new Date(a.data_ora_inizio) - new Date(b.data_ora_inizio)))
    return doc
  }

  // Crea orario speciale per una data specifica (usato con eccezioni apertura)
  const creaOrarioSpeciale = async (operatoreId, dataStr, oraInizio, oraFine) => {
    return databases.createDocument(DB_ID, COLLECTIONS.ORARI_LAVORO, ID.unique(), {
      operatore_id: operatoreId,
      data_specifica: dataStr,
      ora_inizio: oraInizio,
      ora_fine: oraFine,
      giorno_settimana: new Date(dataStr).getDay(),
      attivo: true,
    })
  }

  const eliminaOrarioSpeciale = async (id) => {
    await databases.deleteDocument(DB_ID, COLLECTIONS.ORARI_LAVORO, id)
  }

  const eliminaEccezioneApertura = async (id) => {
    await databases.deleteDocument(DB_ID, COLLECTIONS.BLOCCHI, id)
    setEccezioniApertura(prev => prev.filter(b => b.$id !== id))
  }

  return { blocchi, blocchiRicorrenti, eccezioniApertura, loading, error, crea, aggiorna, elimina, creaRicorrente, eliminaRicorrente, creaEccezioneApertura, eliminaEccezioneApertura, creaOrarioSpeciale, eliminaOrarioSpeciale, refresh: fetch }
}
