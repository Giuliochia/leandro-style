import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

export { GIORNI }

export function useOrariLavoro(operatoreId) {
  const [orari, setOrari] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!operatoreId) return
    setLoading(true)
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
        Query.equal('operatore_id', operatoreId),
        Query.orderAsc('giorno_settimana'),
        Query.limit(50),
      ])
      setOrari(res.documents)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [operatoreId])

  useEffect(() => { fetch() }, [fetch])

  const crea = async (data) => {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.ORARI_LAVORO, ID.unique(), {
      ...data,
      operatore_id: operatoreId,
      attivo: true,
    })
    setOrari(prev => [...prev, doc])
    return doc
  }

  const aggiorna = async (id, data) => {
    const doc = await databases.updateDocument(DB_ID, COLLECTIONS.ORARI_LAVORO, id, data)
    setOrari(prev => prev.map(o => o.$id === id ? doc : o))
    return doc
  }

  const elimina = async (id) => {
    await databases.deleteDocument(DB_ID, COLLECTIONS.ORARI_LAVORO, id)
    setOrari(prev => prev.filter(o => o.$id !== id))
  }

  return { orari, loading, error, crea, aggiorna, elimina, refresh: fetch }
}
