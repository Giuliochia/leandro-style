const REQUIRED_VARS = [
  'VITE_APPWRITE_DATABASE_ID',
  'VITE_COLLECTION_CLIENTI',
  'VITE_COLLECTION_OPERATORI',
  'VITE_COLLECTION_SERVIZI',
  'VITE_COLLECTION_APPUNTAMENTI',
  'VITE_COLLECTION_APPUNTAMENTO_SERVIZI',
  'VITE_COLLECTION_ORARI_LAVORO',
  'VITE_COLLECTION_BLOCCHI',
  'VITE_COLLECTION_PUSH_SUBSCRIPTIONS',
]

for (const key of REQUIRED_VARS) {
  if (!import.meta.env[key]) {
    throw new Error(`Variabile d'ambiente mancante: ${key}. Controlla il file .env`)
  }
}

export const DB_ID: string = import.meta.env.VITE_APPWRITE_DATABASE_ID

export const COLLECTIONS: Record<string, string> = {
  CLIENTI:              import.meta.env.VITE_COLLECTION_CLIENTI,
  OPERATORI:            import.meta.env.VITE_COLLECTION_OPERATORI,
  SERVIZI:              import.meta.env.VITE_COLLECTION_SERVIZI,
  APPUNTAMENTI:         import.meta.env.VITE_COLLECTION_APPUNTAMENTI,
  APPUNTAMENTO_SERVIZI: import.meta.env.VITE_COLLECTION_APPUNTAMENTO_SERVIZI,
  ORARI_LAVORO:         import.meta.env.VITE_COLLECTION_ORARI_LAVORO,
  BLOCCHI:              import.meta.env.VITE_COLLECTION_BLOCCHI,
  PUSH_SUBSCRIPTIONS:   import.meta.env.VITE_COLLECTION_PUSH_SUBSCRIPTIONS,
}
