import webpush from 'web-push'
import { Client, Databases, Query } from 'node-appwrite'

const VAPID_PUBLIC  = process.env.VITE_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@leandrostyle.it'

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT
const APPWRITE_PROJECT  = process.env.VITE_APPWRITE_PROJECT_ID
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

function getClient() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY)
  return new Databases(client)
}

export default async function handler(req, res) {
  // Proteggi il cron con un secret
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getClient()
  const ora = new Date()

  // Trova appuntamenti di oggi con stato prenotato
  const inizioGiorno = new Date(ora)
  inizioGiorno.setHours(0, 0, 0, 0)
  const fineGiorno = new Date(ora)
  fineGiorno.setHours(23, 59, 59, 999)

  let appuntamenti = []
  try {
    const res1 = await db.listDocuments(DB_ID, 'appuntamenti', [
      Query.equal('stato', 'prenotato'),
      Query.greaterThanEqual('data_ora_inizio', inizioGiorno.toISOString()),
      Query.lessThanEqual('data_ora_inizio', fineGiorno.toISOString()),
      Query.limit(100),
    ])
    appuntamenti = res1.documents
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const results = []

  for (const app of appuntamenti) {
    // Evita di mandare il reminder due volte
    if (app.reminder_inviato) continue

    // Recupera subscription del cliente
    let subs = []
    try {
      const s = await db.listDocuments(DB_ID, 'push_subscriptions', [
        Query.equal('account_id', app.account_id_cliente || ''),
        Query.limit(5),
      ])
      subs = s.documents
    } catch { continue }

    if (!subs.length) {
      // Prova a trovare la subscription tramite cliente
      try {
        const cliente = await db.getDocument(DB_ID, 'clienti', app.cliente_id)
        if (cliente.account_id) {
          const s = await db.listDocuments(DB_ID, 'push_subscriptions', [
            Query.equal('account_id', cliente.account_id),
            Query.limit(5),
          ])
          subs = s.documents
        }
      } catch { continue }
    }

    const dataOra = new Date(app.data_ora_inizio)
    const ora_fmt = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
    const giorno = dataOra.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

    const payload = JSON.stringify({
      title: "Leandro's Style ✂️",
      body: `Ricordati: hai un appuntamento oggi alle ${ora_fmt}. A presto!`,
      url: '/appuntamenti',
      tag: `reminder-${app.$id}`,
    })

    let inviato = false
    for (const sub of subs) {
      try {
        const subObj = JSON.parse(sub.subscription)
        await webpush.sendNotification(subObj, payload)
        inviato = true
      } catch (e) {
        // Subscription scaduta — rimuovila
        if (e.statusCode === 410) {
          await db.deleteDocument(DB_ID, 'push_subscriptions', sub.$id).catch(() => {})
        }
      }
    }

    // Segna come inviato per non mandarlo di nuovo
    if (inviato) {
      try {
        await db.updateDocument(DB_ID, 'appuntamenti', app.$id, { reminder_inviato: true })
      } catch {}
      results.push({ id: app.$id, cliente: app.cliente_id })
    }
  }

  return res.status(200).json({ sent: results.length, details: results })
}
