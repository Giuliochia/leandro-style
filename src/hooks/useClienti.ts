import { useState, useEffect, useCallback } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'
import type { Cliente, Appuntamento, DocInput, DocUpdate } from '../types/models'

const normalizzaTel = (tel: string | undefined | null): string | null => {
  if (!tel) return null
  return tel.replace(/\s/g, '').replace(/^\+39/, '').replace(/^0+/, '')
}

const deduplicaClienti = (docs: Cliente[]): Cliente[] => {
  const seen = new Map<string, Cliente>()
  for (const c of docs) {
    const tel = normalizzaTel(c.telefono)
    const key = tel ? `tel:${tel}` : (c.account_id ? `acc:${c.account_id}` : `id:${c.$id}`)
    if (!seen.has(key)) {
      seen.set(key, c)
    } else {
      const existing = seen.get(key)!
      if (!existing.account_id && c.account_id) seen.set(key, c)
    }
  }
  return Array.from(seen.values())
}

export function useClienti({ cerca = '' } = {}) {
  const [tuttiClienti, setTuttiClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await databases.listDocuments<Cliente>(DB_ID, COLLECTIONS.CLIENTI, [
        Query.orderAsc('nome'),
        Query.limit(200),
      ])
      setTuttiClienti(deduplicaClienti(res.documents))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const clienti = cerca.trim()
    ? tuttiClienti.filter(c => {
        const q = cerca.trim().toLowerCase()
        return (
          c.nome?.toLowerCase().includes(q) ||
          normalizzaTel(c.telefono)?.includes(normalizzaTel(q) ?? q)
        )
      })
    : tuttiClienti

  const crea = async (data: DocInput<Cliente>) => {
    const doc = await databases.createDocument<Cliente>(DB_ID, COLLECTIONS.CLIENTI, ID.unique(), {
      ...data,
      created_at: new Date().toISOString(),
    })
    setTuttiClienti(prev => [...prev, doc].sort((a, b) => a.nome.localeCompare(b.nome)))
    return doc
  }

  const aggiorna = async (id: string, data: DocUpdate<Cliente>) => {
    const doc = await databases.updateDocument<Cliente>(DB_ID, COLLECTIONS.CLIENTI, id, data)
    setTuttiClienti(prev => prev.map(c => c.$id === id ? doc : c))
    return doc
  }

  return { clienti, loading, error, crea, aggiorna, refresh: fetch }
}

export function useCliente(id: string | undefined) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, a] = await Promise.all([
        databases.getDocument<Cliente>(DB_ID, COLLECTIONS.CLIENTI, id),
        databases.listDocuments<Appuntamento>(DB_ID, COLLECTIONS.APPUNTAMENTI, [
          Query.equal('cliente_id', id),
          Query.orderDesc('data_ora_inizio'),
          Query.limit(50),
        ]),
      ])
      setCliente(c)
      setAppuntamenti(a.documents)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const aggiorna = async (data: DocUpdate<Cliente>) => {
    const doc = await databases.updateDocument<Cliente>(DB_ID, COLLECTIONS.CLIENTI, id!, data)
    setCliente(doc)
    return doc
  }

  return { cliente, appuntamenti, loading, error, aggiorna, refresh: fetch }
}
