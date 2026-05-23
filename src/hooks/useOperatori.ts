import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'
import type { Operatore, DocInput, DocUpdate } from '../types/models'

export function useOperatori() {
  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await databases.listDocuments<Operatore>(DB_ID, COLLECTIONS.OPERATORI, [
        Query.orderAsc('ordine'),
        Query.limit(20),
      ])
      setOperatori(res.documents)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const crea = async (data: DocInput<Operatore>) => {
    const maxOrdine = operatori.length ? Math.max(...operatori.map(o => o.ordine)) : -1
    const doc = await databases.createDocument<Operatore>(DB_ID, COLLECTIONS.OPERATORI, ID.unique(), {
      ...data,
      ordine: maxOrdine + 1,
      attivo: true,
    })
    setOperatori(prev => [...prev, doc])
    return doc
  }

  const aggiorna = async (id: string, data: DocUpdate<Operatore>) => {
    const doc = await databases.updateDocument<Operatore>(DB_ID, COLLECTIONS.OPERATORI, id, data)
    setOperatori(prev => prev.map(o => o.$id === id ? doc : o))
    return doc
  }

  const toggleAttivo = async (id: string, attivo: boolean) => aggiorna(id, { attivo })

  return { operatori, loading, error, crea, aggiorna, toggleAttivo, refresh: fetch }
}
