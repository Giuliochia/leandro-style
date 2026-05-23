import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { account, databases, teams } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, OAuthProvider, Query } from 'appwrite'
import { logError } from '../lib/logger'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [clienteStatus, setClienteStatus] = useState('loading') // 'loading' | 'missing' | 'loaded'
  const [cliente, setCliente] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const applyCliente = useCallback((doc) => {
    setCliente(doc)
    setClienteStatus(doc ? 'loaded' : 'missing')
  }, [])

  const fetchCliente = useCallback(async (accountId) => {
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [
        Query.equal('account_id', accountId),
        Query.limit(1),
      ])
      return res.documents[0] || null
    } catch (e) {
      logError('fetchCliente', e, { accountId })
      return null
    }
  }, [])

  const fetchClienteByEmail = useCallback(async (email) => {
    if (!email) return null
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [
        Query.equal('email', email),
        Query.limit(1),
      ])
      return res.documents[0] ?? null
    } catch (e) {
      logError('fetchClienteByEmail', e, { email })
      return null
    }
  }, [])

  const checkAdmin = useCallback(async () => {
    try {
      const membershipList = await teams.listMemberships('admin')
      return membershipList.total > 0
    } catch (e) {
      logError('checkAdmin', e)
      return false
    }
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const u = await account.get()
      setUser(u)
      const admin = await checkAdmin()
      setIsAdmin(admin)
      if (!admin) {
        const c = await fetchCliente(u.$id)
        applyCliente(c)
      } else {
        applyCliente(null)
      }
    } catch (e) {
      logError('loadSession', e)
      setUser(null)
      setIsAdmin(false)
      applyCliente(null)
    } finally {
      setLoading(false)
    }
  }, [checkAdmin, fetchCliente])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Email + password login
  const login = async (email, password) => {
    await account.createEmailPasswordSession(email, password)
    await loadSession()
  }

  // Registrazione con verifica email + anti-doppione
  const register = async (nome, email, password) => {
    // Controlla se esiste già un cliente con questa email (da telefono o OAuth precedente)
    let existingCliente = await fetchClienteByEmail(email)

    const userId = ID.unique()
    await account.create(userId, email, password, nome)
    await account.createEmailPasswordSession(email, password)
    await account.createVerification(`${window.location.origin}/verifica-email`)

    const u = await account.get()
    setUser(u)
    setIsAdmin(false)

    if (existingCliente && !existingCliente.account_id) {
      // Collega l'account esistente (cliente da telefono)
      await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTI, existingCliente.$id, {
        account_id: u.$id,
        email,
      })
      const updated = await fetchCliente(u.$id)
      applyCliente(updated)
    } else {
      // Crea nuova scheda cliente
      const now = new Date().toISOString()
      const doc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.CLIENTI,
        ID.unique(),
        { nome, email, account_id: u.$id, created_at: now },
      )
      applyCliente(doc)
    }
  }

  // OAuth (Google) — redirect
  const loginWithGoogle = () => {
    account.createOAuth2Token(
      OAuthProvider.Google,
      `${window.location.origin}/oauth-callback`,
      `${window.location.origin}/login?error=oauth`,
    )
  }

  /**
   * Legge il documento cliente con exponential backoff.
   * Necessario dopo un 409: Appwrite ha accepted la scrittura del tab
   * concorrente ma il nodo che stiamo leggendo potrebbe non averla ancora
   * propagata (eventual consistency). Riproviamo fino a MAX_TENTATIVI.
   */
  const fetchClienteConBackoff = useCallback(async (accountId) => {
    const MAX_TENTATIVI = 4
    const BASE_DELAY_MS = 150 // 150ms → 300ms → 600ms → 1200ms

    for (let tentativo = 1; tentativo <= MAX_TENTATIVI; tentativo++) {
      const doc = await fetchCliente(accountId)
      if (doc) return doc
      // Documento non ancora propagato — aspettiamo con backoff esponenziale
      if (tentativo < MAX_TENTATIVI) {
        await new Promise(r => setTimeout(r, BASE_DELAY_MS * 2 ** (tentativo - 1)))
      }
    }
    return null // dopo tutti i tentativi, il documento non è apparso
  }, [fetchCliente])

  // Chiamato dopo redirect OAuth per creare/collegare scheda cliente
  const handleOAuthCallback = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const userId = searchParams.get('userId') || hashParams.get('userId')
    const secret = searchParams.get('secret') || hashParams.get('secret')
    if (userId && secret) {
      await account.createSession(userId, secret)
    }
    const u = await account.get()
    setUser(u)
    const admin = await checkAdmin()
    setIsAdmin(admin)
    if (!admin) {
      let c = await fetchCliente(u.$id)
      if (!c) {
        const existingByEmail = await fetchClienteByEmail(u.email)
        if (existingByEmail && !existingByEmail.account_id) {
          await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTI, existingByEmail.$id, {
            account_id: u.$id,
          })
          // Backoff dopo update: la propagazione dell'account_id potrebbe richiedere
          // qualche millisecondo sul nodo di lettura
          c = await fetchClienteConBackoff(u.$id)
        } else if (!existingByEmail) {
          const now = new Date().toISOString()
          try {
            c = await databases.createDocument(
              DB_ID,
              COLLECTIONS.CLIENTI,
              ID.unique(),
              {
                nome: u.name || u.email,
                email: u.email || '',
                account_id: u.$id,
                created_at: now,
              },
            )
          } catch (createErr) {
            if (createErr?.code === 409) {
              // Un altro tab ha già creato il documento. Aspettiamo che
              // la scrittura si propaghi prima di rileggerla.
              c = await fetchClienteConBackoff(u.$id)
              if (!c) {
                // Fallback estremo: il documento esiste ma non è ancora
                // leggibile — usiamo i dati dell'account come stub
                logError('handleOAuthCallback/backoff-esaurito', createErr, { userId: u.$id })
              }
            } else {
              throw createErr
            }
          }
        } else {
          c = existingByEmail
        }
      }
      applyCliente(c)
    }
    return { admin: await checkAdmin() }
  }, [checkAdmin, fetchCliente, fetchClienteByEmail, fetchClienteConBackoff, applyCliente])

  const logout = async () => {
    await account.deleteSession('current')
    setUser(null)
    setIsAdmin(false)
    applyCliente(null)
  }

  const sendPasswordRecovery = async (email) => {
    await account.createRecovery(email, `${window.location.origin}/reset-password`)
  }

  const confirmPasswordRecovery = async (userId, secret, newPassword) => {
    await account.updateRecovery(userId, secret, newPassword)
  }

  const confirmEmailVerification = async (userId, secret) => {
    await account.updateVerification(userId, secret)
  }

  const updateProfilo = async (data) => {
    if (data.nome) await account.updateName(data.nome)
    const u = user || await account.get()
    // Cerca il documento clienti fresco dal DB (non dallo state che potrebbe essere stale)
    const c = await fetchCliente(u.$id)
    if (c) {
      const updated = await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTI, c.$id, data)
      applyCliente(updated)
    } else {
      // Documento non esiste ancora — crealo
      const now = new Date().toISOString()
      const created = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTI, ID.unique(), {
        nome: data.nome || u.name || '',
        email: u.email || '',
        account_id: u.$id,
        telefono: data.telefono || '',
        created_at: now,
      })
      applyCliente(created)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      cliente,
      clienteStatus,
      isAdmin,
      loading,
      login,
      register,
      loginWithGoogle,
      handleOAuthCallback,
      logout,
      sendPasswordRecovery,
      confirmPasswordRecovery,
      confirmEmailVerification,
      updateProfilo,
      refreshCliente: () => user && fetchCliente(user.$id).then(applyCliente),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}
