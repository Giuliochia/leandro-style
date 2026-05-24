import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'
import type { Servizio, DocInput, DocUpdate } from '../types/models'

export function useServizi() {
  const [servizi, setServizi] = useState<Servizio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await databases.listDocuments<Servizio>(DB_ID, COLLECTIONS.SERVIZI, [
        Query.orderAsc('ordine'),
        Query.limit(100),
      ])
      setServizi(res.documents)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const crea = async (data: DocInput<Servizio>) => {
    const maxOrdine = servizi.length ? Math.max(...servizi.map(s => s.ordine)) : -1
    const doc = await databases.createDocument<Servizio>(DB_ID, COLLECTIONS.SERVIZI, ID.unique(), {
      ...data,
      ordine: maxOrdine + 1,
      attivo: true,
    })
    setServizi(prev => [...prev, doc])
    return doc
  }

  const aggiorna = async (id: string, data: DocUpdate<Servizio>) => {
    const doc = await databases.updateDocument<Servizio>(DB_ID, COLLECTIONS.SERVIZI, id, data)
    setServizi(prev => prev.map(s => s.$id === id ? doc : s))
    return doc
  }

  const toggleAttivo = async (id: string, attivo: boolean) => aggiorna(id, { attivo })

  const spostaOrdine = async (id: string, direzione: number) => {
    const idx = servizi.findIndex(s => s.$id === id)
    if (idx === -1) return
    const target = idx + direzione
    if (target < 0 || target >= servizi.length) return
    const a = servizi[idx]
    const b = servizi[target]
    await Promise.all([
      databases.updateDocument(DB_ID, COLLECTIONS.SERVIZI, a.$id, { ordine: b.ordine }),
      databases.updateDocument(DB_ID, COLLECTIONS.SERVIZI, b.$id, { ordine: a.ordine }),
    ])
    await fetch()
  }

  return { servizi, loading, error, crea, aggiorna, toggleAttivo, spostaOrdine, refresh: fetch }
}
