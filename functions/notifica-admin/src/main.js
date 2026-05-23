import { Client, Databases, Query } from 'node-appwrite'
import webpush from 'web-push'

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

  const db = new Databases(client)
  const DB_ID = process.env.DATABASE_ID

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  try {
    // Accetta solo trigger da eventi Appwrite, non chiamate HTTP dirette
    if (req.headers['x-appwrite-trigger'] !== 'event') {
      log('Skipped: not an Appwrite event trigger')
      return res.json({ ok: true, skipped: true })
    }

    const app = req.body

    if (!app || app.created_by !== 'cliente') {
      log('Skipped: not a cliente booking')
      return res.json({ ok: true, skipped: true })
    }

    const cliente = await db.getDocument(DB_ID, 'clienti', app.cliente_id).catch(() => null)
    const dataOra = new Date(app.data_ora_inizio)
    const dataStr = dataOra.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    const oraStr = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

    const payload = JSON.stringify({
      title: 'Nuova prenotazione',
      body: `${cliente?.nome || 'Cliente'} — ${dataStr} alle ${oraStr}`,
      tag: `new-app-${app.$id}`,
      url: '/admin/agenda',
    })

    // Recupera subscriptions admin
    const subs = await db.listDocuments(DB_ID, 'push_subscriptions', [
      Query.equal('ruolo', 'admin'),
      Query.limit(10),
    ])

    log(`Subscriptions admin: ${subs.documents.length}`)

    for (const sub of subs.documents) {
      try {
        const subObj = JSON.parse(sub.subscription)
        await webpush.sendNotification(
          { endpoint: subObj.endpoint, keys: { p256dh: subObj.keys.p256dh, auth: subObj.keys.auth } },
          payload,
        )
        log(`Notifica inviata a ${subObj.endpoint.slice(0, 40)}...`)
      } catch (e) {
        if (e.statusCode === 410) {
          db.deleteDocument(DB_ID, 'push_subscriptions', sub.$id).catch(() => {})
        } else {
          error(`Errore invio: ${e.message}`)
        }
      }
    }

    return res.json({ ok: true, notificate: subs.documents.length })
  } catch (e) {
    error(e.message)
    return res.json({ ok: false, error: e.message }, 500)
  }
}
