import { Client, Databases, Query } from 'node-appwrite'
import webpush from 'web-push'
import { addMinutes } from 'date-fns'

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

  const db = new Databases(client)
  const DB_ID = process.env.DATABASE_ID
  const now = new Date()

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  try {
    const finestra = 5
    const da = now
    const a = new Date(now.getTime() + finestra * 60000)

    const result = await db.listDocuments(DB_ID, 'appuntamenti', [
      Query.equal('stato', 'prenotato'),
      Query.isNull('promemoria_inviato'),
      Query.greaterThan('data_ora_inizio', now.toISOString()),
      Query.lessThanEqual('data_ora_inizio', new Date(now.getTime() + 26 * 3600000).toISOString()),
      Query.limit(200),
    ])

    const daInviare = result.documents.filter(app => {
      const dataInizio = new Date(app.data_ora_inizio)
      const momentoPromemoria = new Date(dataInizio.getTime() - app.promemoria_offset_minuti * 60000)
      return momentoPromemoria >= da && momentoPromemoria < a
    })

    log(`Appuntamenti da notificare: ${daInviare.length}`)

    for (const app of daInviare) {
      try {
        // Recupera account_id del cliente
        const cliente = await db.getDocument(DB_ID, 'clienti', app.cliente_id).catch(() => null)
        if (!cliente?.account_id) continue

        const subs = await db.listDocuments(DB_ID, 'push_subscriptions', [
          Query.equal('account_id', cliente.account_id),
          Query.limit(10),
        ])

        const dataOra = new Date(app.data_ora_inizio)
        const oraStr = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        const minutiRimanenti = Math.round((dataOra - now) / 60000)

        const payload = JSON.stringify({
          title: 'Leandro Style — Promemoria',
          body: minutiRimanenti < 60
            ? `Il tuo appuntamento è tra ${minutiRimanenti} minuti (${oraStr})`
            : `Domani hai un appuntamento alle ${oraStr}`,
          tag: `app-${app.$id}`,
          url: '/appuntamenti',
        })

        for (const sub of subs.documents) {
          try {
            const subObj = JSON.parse(sub.subscription)
            await webpush.sendNotification(
              { endpoint: subObj.endpoint, keys: { p256dh: subObj.keys.p256dh, auth: subObj.keys.auth } },
              payload,
            )
          } catch (e) {
            if (e.statusCode === 410) {
              db.deleteDocument(DB_ID, 'push_subscriptions', sub.$id).catch(() => {})
            }
          }
        }

        await db.updateDocument(DB_ID, 'appuntamenti', app.$id, {
          promemoria_inviato: now.toISOString(),
        }).catch(() => {})

        log(`Notifica inviata per appuntamento ${app.$id}`)
      } catch (e) {
        error(`Errore per appuntamento ${app.$id}: ${e.message}`)
      }
    }

    return res.json({ ok: true, notificate: daInviare.length })
  } catch (e) {
    error(e.message)
    return res.json({ ok: false, error: e.message }, 500)
  }
}
