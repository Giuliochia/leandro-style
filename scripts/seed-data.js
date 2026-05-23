/**
 * Popola il database con i dati reali di Leandro Style.
 * Uso: node scripts/seed-data.js
 */

import { Client, Databases, ID, Query } from 'node-appwrite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env.init')
let envVars = {}
try {
  const raw = readFileSync(envPath, 'utf8')
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    envVars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  })
} catch {
  console.error('File .env.init non trovato.')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(envVars.APPWRITE_ENDPOINT)
  .setProject(envVars.APPWRITE_PROJECT_ID)
  .setKey(envVars.APPWRITE_API_KEY)

const db = new Databases(client)
const DB = envVars.APPWRITE_DATABASE_ID

async function upsert(collection, checkFn, createFn, label) {
  try {
    const existing = await checkFn()
    if (existing) { console.log(`  ~ ${label} (già esistente)`); return existing }
  } catch { /* non esiste */ }
  try {
    const doc = await createFn()
    console.log(`  ✓ ${label}`)
    return doc
  } catch (e) {
    if (e.code === 409) { console.log(`  ~ ${label} (già esistente)`); return null }
    console.error(`  ✗ ${label}: ${e.message}`)
    return null
  }
}

async function main() {
  console.log('=== Seed dati Leandro Style ===\n')

  // ── Operatore ──────────────────────────────────────────────────────
  console.log('Operatore:')
  let operatore = null
  try {
    const res = await db.listDocuments(DB, 'operatori', [Query.equal('nome', 'Leandro')])
    operatore = res.documents[0]
    if (operatore) console.log('  ~ Leandro (già esistente)')
  } catch { /* ignora */ }

  if (!operatore) {
    operatore = await db.createDocument(DB, 'operatori', ID.unique(), {
      nome: 'Leandro',
      attivo: true,
      ordine: 0,
    })
    console.log('  ✓ Leandro creato')
  }

  const opId = operatore.$id

  // ── Pulisci orari e servizi esistenti ─────────────────────────────
  console.log('\nPulizia dati esistenti:')

  const orariEsistenti = await db.listDocuments(DB, 'orari_lavoro', [Query.limit(100)])
  for (const o of orariEsistenti.documents) {
    await db.deleteDocument(DB, 'orari_lavoro', o.$id)
  }
  console.log(`  ✓ Eliminati ${orariEsistenti.total} orari`)

  const serviziEsistenti = await db.listDocuments(DB, 'servizi', [Query.limit(100)])
  for (const s of serviziEsistenti.documents) {
    await db.deleteDocument(DB, 'servizi', s.$id)
  }
  console.log(`  ✓ Eliminati ${serviziEsistenti.total} servizi`)

  // ── Orari di lavoro: Mar–Sab 10:00–12:30 e 14:00–20:00 ───────────
  console.log('\nOrari di lavoro:')
  const giorni = [2, 3, 4, 5, 6] // Mar→Sab (0=Dom)
  const giorniNomi = ['', '', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

  for (const g of giorni) {
    await db.createDocument(DB, 'orari_lavoro', ID.unique(), {
      operatore_id: opId,
      giorno_settimana: g,
      ora_inizio: '10:00',
      ora_fine: '12:30',
      attivo: true,
    })
    await db.createDocument(DB, 'orari_lavoro', ID.unique(), {
      operatore_id: opId,
      giorno_settimana: g,
      ora_inizio: '14:00',
      ora_fine: '20:00',
      attivo: true,
    })
    console.log(`  ✓ ${giorniNomi[g]}: 10:00–12:30 e 14:00–20:00`)
  }

  // ── Servizi ────────────────────────────────────────────────────────
  console.log('\nServizi:')
  const serviziDaCreare = [
    { nome: 'Taglio & consulenza',      durata_minuti: 30 },
    { nome: 'Taglio e barba e shampoo', durata_minuti: 45 },
    { nome: 'Taglio e barba',           durata_minuti: 40 },
    { nome: 'Rasatura',                 durata_minuti: 20 },
    { nome: 'Rasatura e Barba',         durata_minuti: 30 },
    { nome: 'Barba - barba detoxy',     durata_minuti: 30 },
    { nome: 'Cheratina',                durata_minuti: 60 },
    { nome: 'Servizi tecnici',          durata_minuti: 60 },
    { nome: 'Piega - piega relax',      durata_minuti: 45 },
    { nome: 'Sopracciglia',             durata_minuti: 15 },
  ]

  for (let i = 0; i < serviziDaCreare.length; i++) {
    const s = serviziDaCreare[i]
    await db.createDocument(DB, 'servizi', ID.unique(), {
      nome: s.nome,
      durata_minuti: s.durata_minuti,
      attivo: true,
      ordine: i,
    })
    console.log(`  ✓ ${s.nome} (${s.durata_minuti} min)`)
  }

  console.log('\n✅ Seed completato!')
  console.log('\nNota: le durate sono stime — puoi cambiarle da /admin/servizi.')
}

main().catch(e => { console.error(e); process.exit(1) })
