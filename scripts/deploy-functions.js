#!/usr/bin/env node
// Crea (o aggiorna) le due Appwrite Functions e ne configura le variabili d'ambiente
// Uso: node scripts/deploy-functions.js

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Legge .env.init
const envRaw = readFileSync(join(__dir, '../.env.init'), 'utf8')
const env = {}
for (const line of envRaw.split(/\r?\n/)) {
  const idx = line.indexOf('=')
  if (idx < 0 || line.startsWith('#')) continue
  env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const ENDPOINT    = env.APPWRITE_ENDPOINT
const PROJECT_ID  = env.APPWRITE_PROJECT_ID
const API_KEY     = env.APPWRITE_API_KEY
const DATABASE_ID = env.APPWRITE_DATABASE_ID

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Key': API_KEY,
  'X-Appwrite-Project': PROJECT_ID,
}

async function api(method, path, body) {
  const r = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  try { return JSON.parse(text) } catch { return text }
}

const VARS = {
  APPWRITE_API_KEY:   API_KEY,
  DATABASE_ID,
  VAPID_PUBLIC_KEY:   env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY:  env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT:      env.VAPID_SUBJECT,
}

async function creaOAggiorna(functionId, nome, runtime, schedule, events) {
  // Controlla se esiste
  const existing = await api('GET', `/v1/functions/${functionId}`)
  if (existing.$id) {
    console.log(`✓ Function "${nome}" già esistente (${functionId})`)
  } else {
    const res = await api('POST', '/v1/functions', {
      functionId,
      name: nome,
      runtime,
      execute: ['any'],
      ...(schedule && { schedule }),
      ...(events && { events }),
    })
    console.log(`+ Creata function "${nome}":`, res.$id || res.message)
  }

  // Imposta variabili
  for (const [key, value] of Object.entries(VARS)) {
    const r = await api('POST', `/v1/functions/${functionId}/variables`, { key, value })
    if (r.$id) console.log(`  var ${key} = OK`)
    else if (r.type === 'variable_already_exists') {
      // Aggiorna
      const list = await api('GET', `/v1/functions/${functionId}/variables`)
      const existing = list.variables?.find(v => v.key === key)
      if (existing) {
        await api('PUT', `/v1/functions/${functionId}/variables/${existing.$id}`, { key, value })
        console.log(`  var ${key} = aggiornata`)
      }
    } else {
      console.log(`  var ${key} = ${r.message || JSON.stringify(r)}`)
    }
  }
}

console.log('=== Deploy Appwrite Functions ===\n')

await creaOAggiorna(
  'promemoria-push',
  'Promemoria Push',
  'node-18.0',
  '*/5 * * * *', // ogni 5 minuti
  null,
)

await creaOAggiorna(
  'notifica-admin',
  'Notifica Admin',
  'node-18.0',
  null,
  [`databases.${DATABASE_ID}.collections.appuntamenti.documents.*.create`],
)

console.log('\n✅ Functions configurate.')
console.log('\nOra devi caricare il codice manualmente dal pannello Appwrite:')
console.log('  1. Vai su https://cloud.appwrite.io → Functions')
console.log('  2. Per "Promemoria Push": carica la cartella functions/promemoria-push/')
console.log('  3. Per "Notifica Admin": carica la cartella functions/notifica-admin/')
console.log('  4. In entrambe imposta "Entry point": src/main.js')
