/**
 * Script di inizializzazione Appwrite
 * Crea tutte le collection, attributi, indici e il team admin.
 *
 * Uso:
 *   node scripts/init-appwrite.js
 *
 * Richiede le variabili d'ambiente nel file .env.init:
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY
 */

import { Client, Databases, Teams, Permission, Role } from 'node-appwrite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carica .env.init
const envPath = join(__dirname, '..', '.env.init')
let envVars = {}
try {
  const raw = readFileSync(envPath, 'utf8')
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (k) envVars[k] = v
  })
} catch {
  console.error('File .env.init non trovato. Crealo copiando .env.init.example')
  process.exit(1)
}

const ENDPOINT = envVars.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const PROJECT_ID = envVars.APPWRITE_PROJECT_ID
const DATABASE_ID = envVars.APPWRITE_DATABASE_ID
const API_KEY = envVars.APPWRITE_API_KEY

if (!PROJECT_ID || !DATABASE_ID || !API_KEY) {
  console.error('Mancano APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID o APPWRITE_API_KEY in .env.init')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)

const db = new Databases(client)
const teamsService = new Teams(client)

const dbId = DATABASE_ID

// Permessi standard: solo admin team può leggere/scrivere a livello collection
// I permessi documento vengono impostati al momento della creazione dal codice app
const adminPerms = [
  Permission.read(Role.team('admin')),
  Permission.create(Role.team('admin')),
  Permission.update(Role.team('admin')),
  Permission.delete(Role.team('admin')),
]

// Permessi collection aperte in scrittura agli utenti autenticati (clienti creano doc propri)
const userWritePerms = [
  Permission.read(Role.team('admin')),
  Permission.create(Role.users()),
  Permission.update(Role.team('admin')),
  Permission.delete(Role.team('admin')),
]

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function safeCreate(fn, label) {
  try {
    const res = await fn()
    console.log(`  ✓ ${label}`)
    return res
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ~ ${label} (già esistente)`)
    } else {
      console.error(`  ✗ ${label}: ${e.message}`)
    }
  }
}

async function createCollection(id, name, perms, attributes, indexes) {
  console.log(`\nCollection: ${name}`)
  await safeCreate(
    () => db.createCollection(dbId, id, name, perms),
    `Creazione collection`
  )
  await sleep(300)

  for (const attr of attributes) {
    await sleep(200)
    // Appwrite non permette required=true con un default: se c'è default, required=false
    const required = attr.default !== undefined ? false : (attr.required || false)
    if (attr.type === 'string') {
      await safeCreate(
        () => db.createStringAttribute(dbId, id, attr.key, attr.size || 255, required, attr.default ?? null, attr.array || false),
        `Attributo string: ${attr.key}`
      )
    } else if (attr.type === 'integer') {
      await safeCreate(
        () => db.createIntegerAttribute(dbId, id, attr.key, required, attr.min ?? null, attr.max ?? null, attr.default ?? null),
        `Attributo integer: ${attr.key}`
      )
    } else if (attr.type === 'boolean') {
      await safeCreate(
        () => db.createBooleanAttribute(dbId, id, attr.key, required, attr.default ?? null),
        `Attributo boolean: ${attr.key}`
      )
    } else if (attr.type === 'datetime') {
      await safeCreate(
        () => db.createDatetimeAttribute(dbId, id, attr.key, required, attr.default ?? null),
        `Attributo datetime: ${attr.key}`
      )
    } else if (attr.type === 'enum') {
      await safeCreate(
        () => db.createEnumAttribute(dbId, id, attr.key, attr.elements, required, attr.default ?? null),
        `Attributo enum: ${attr.key}`
      )
    }
  }

  // Attendi che gli attributi siano pronti prima di creare gli indici
  await sleep(2000)

  for (const idx of (indexes || [])) {
    await sleep(300)
    await safeCreate(
      () => db.createIndex(dbId, id, idx.key, idx.type || 'key', idx.attributes, idx.orders),
      `Indice: ${idx.key}`
    )
  }
}

async function main() {
  console.log('=== Inizializzazione Appwrite — Leandro Style ===\n')

  // ── Team admin ──────────────────────────────────────────────────────────────
  console.log('Team admin:')
  await safeCreate(
    () => teamsService.create('admin', 'admin'),
    'Creazione team admin'
  )

  // ── clienti ─────────────────────────────────────────────────────────────────
  await createCollection('clienti', 'clienti', userWritePerms, [
    { key: 'nome', type: 'string', size: 100, required: true },
    { key: 'telefono', type: 'string', size: 30 },
    { key: 'email', type: 'string', size: 255 },
    { key: 'note', type: 'string', size: 2000 },
    { key: 'account_id', type: 'string', size: 100 },
    { key: 'created_at', type: 'datetime', required: true },
  ], [
    { key: 'idx_account_id', attributes: ['account_id'], orders: ['ASC'] },
    { key: 'idx_email', attributes: ['email'], orders: ['ASC'] },
    { key: 'idx_telefono', attributes: ['telefono'], orders: ['ASC'] },
  ])

  // ── operatori ────────────────────────────────────────────────────────────────
  await createCollection('operatori', 'operatori', adminPerms, [
    { key: 'nome', type: 'string', size: 100, required: true },
    { key: 'attivo', type: 'boolean', required: true, default: true },
    { key: 'ordine', type: 'integer', required: true, default: 0 },
  ])

  // ── servizi ──────────────────────────────────────────────────────────────────
  await createCollection('servizi', 'servizi', [
    Permission.read(Role.users()),
    Permission.read(Role.team('admin')),
    Permission.create(Role.team('admin')),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ], [
    { key: 'nome', type: 'string', size: 150, required: true },
    { key: 'durata_minuti', type: 'integer', required: true, min: 5, max: 480 },
    { key: 'attivo', type: 'boolean', required: true, default: true },
    { key: 'ordine', type: 'integer', required: true, default: 0 },
  ])

  // ── appuntamenti ─────────────────────────────────────────────────────────────
  await createCollection('appuntamenti', 'appuntamenti', userWritePerms, [
    { key: 'cliente_id', type: 'string', size: 100, required: true },
    { key: 'operatore_id', type: 'string', size: 100, required: true },
    { key: 'data_ora_inizio', type: 'datetime', required: true },
    { key: 'durata_minuti', type: 'integer', required: true, min: 5 },
    { key: 'stato', type: 'enum', elements: ['prenotato', 'completato', 'annullato', 'no_show'], required: true, default: 'prenotato' },
    { key: 'note', type: 'string', size: 1000 },
    { key: 'promemoria_offset_minuti', type: 'integer', default: 60 },
    { key: 'promemoria_inviato', type: 'datetime' },
    { key: 'created_by', type: 'enum', elements: ['cliente', 'admin'], required: true },
    { key: 'created_at', type: 'datetime', required: true },
  ], [
    { key: 'idx_operatore_data', attributes: ['operatore_id', 'data_ora_inizio'], orders: ['ASC', 'ASC'] },
    { key: 'idx_cliente_data', attributes: ['cliente_id', 'data_ora_inizio'], orders: ['ASC', 'ASC'] },
    { key: 'idx_stato', attributes: ['stato'], orders: ['ASC'] },
    { key: 'idx_promemoria', attributes: ['promemoria_inviato', 'stato'], orders: ['ASC', 'ASC'] },
  ])

  // ── appuntamento_servizi ─────────────────────────────────────────────────────
  await createCollection('appuntamento_servizi', 'appuntamento_servizi', userWritePerms, [
    { key: 'appuntamento_id', type: 'string', size: 100, required: true },
    { key: 'servizio_id', type: 'string', size: 100, required: true },
  ], [
    { key: 'idx_appuntamento', attributes: ['appuntamento_id'], orders: ['ASC'] },
  ])

  // ── orari_lavoro ─────────────────────────────────────────────────────────────
  await createCollection('orari_lavoro', 'orari_lavoro', [
    Permission.read(Role.users()),
    Permission.read(Role.team('admin')),
    Permission.create(Role.team('admin')),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ], [
    { key: 'operatore_id', type: 'string', size: 100, required: true },
    { key: 'giorno_settimana', type: 'integer', required: true, min: 0, max: 6 },
    { key: 'ora_inizio', type: 'string', size: 5, required: true },
    { key: 'ora_fine', type: 'string', size: 5, required: true },
    { key: 'attivo', type: 'boolean', required: true, default: true },
  ], [
    { key: 'idx_operatore_giorno', attributes: ['operatore_id', 'giorno_settimana'], orders: ['ASC', 'ASC'] },
  ])

  // ── blocchi ──────────────────────────────────────────────────────────────────
  await createCollection('blocchi', 'blocchi', [
    Permission.read(Role.users()),
    Permission.read(Role.team('admin')),
    Permission.create(Role.team('admin')),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ], [
    { key: 'operatore_id', type: 'string', size: 100 },
    { key: 'data_ora_inizio', type: 'datetime', required: true },
    { key: 'data_ora_fine', type: 'datetime', required: true },
    { key: 'motivo', type: 'string', size: 500 },
  ], [
    { key: 'idx_date', attributes: ['data_ora_inizio', 'data_ora_fine'], orders: ['ASC', 'ASC'] },
  ])

  // ── push_subscriptions ───────────────────────────────────────────────────────
  await createCollection('push_subscriptions', 'push_subscriptions', userWritePerms, [
    { key: 'account_id', type: 'string', size: 100, required: true },
    { key: 'subscription', type: 'string', size: 2000, required: true },
    { key: 'ruolo', type: 'enum', elements: ['cliente', 'admin'], required: true },
    { key: 'created_at', type: 'datetime', required: true },
  ], [
    { key: 'idx_account', attributes: ['account_id'], orders: ['ASC'] },
    { key: 'idx_ruolo', attributes: ['ruolo'], orders: ['ASC'] },
  ])

  console.log('\n✅ Inizializzazione completata!')
  console.log('\nProseguire:')
  console.log('1. Vai su Appwrite → Auth → Teams → aggiungi l\'utente admin al team "admin"')
  console.log('2. Aggiungi la piattaforma Web localhost in Settings → Platforms')
  console.log('3. Abilita Google OAuth in Auth → Settings → OAuth2 Providers')
}

main().catch(e => {
  console.error('Errore fatale:', e)
  process.exit(1)
})
