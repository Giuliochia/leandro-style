import { useEffect, useState } from 'react'
import { databases } from '../appwrite/client'
import { DB_ID, COLLECTIONS } from '../appwrite/config'
import { ID, Query } from 'appwrite'
import { useAuth } from '../auth/AuthContext'
import { logError } from '../lib/logger'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications(ruolo = 'cliente') {
  const { user } = useAuth()
  const [permesso, setPermesso] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-push.js', { scope: '/' }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!user || permesso !== 'granted') return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscribed(true) })
      .catch(() => {})
  }, [user, permesso])

  const chiediPermesso = async () => {
    if (!user || !VAPID_PUBLIC || typeof Notification === 'undefined') return false
    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermesso(result)
      if (result !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })

      const subJson = sub.toJSON()
      const subString = JSON.stringify(subJson)

      // Controlla se esiste già
      const esistente = await databases.listDocuments(DB_ID, COLLECTIONS.PUSH_SUBSCRIPTIONS, [
        Query.equal('account_id', user.$id),
        Query.limit(1),
      ])

      if (esistente.documents.length) {
        await databases.updateDocument(DB_ID, COLLECTIONS.PUSH_SUBSCRIPTIONS, esistente.documents[0].$id, {
          subscription: subString,
        })
      } else {
        await databases.createDocument(DB_ID, COLLECTIONS.PUSH_SUBSCRIPTIONS, ID.unique(), {
          account_id: user.$id,
          subscription: subString,
          ruolo,
          created_at: new Date().toISOString(),
        })
      }

      setSubscribed(true)
      return true
    } catch (e) {
      logError('usePushNotifications/chiediPermesso', e, { userId: user?.$id })
      return false
    } finally {
      setLoading(false)
    }
  }

  return { permesso, subscribed, loading, chiediPermesso }
}
