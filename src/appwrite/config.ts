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
