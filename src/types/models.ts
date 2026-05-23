import type { Models } from 'appwrite'

// Tipo per i dati di creazione/aggiornamento (esclude i campi gestiti da Appwrite)
export type DocInput<T extends Models.Document> = Omit<T, keyof Models.Document>
export type DocUpdate<T extends Models.Document> = Partial<DocInput<T>>

export interface Servizio extends Models.Document {
  nome: string
  durata_minuti: number
  prezzo?: number
  descrizione?: string
  ordine: number
  attivo: boolean
}

export interface Operatore extends Models.Document {
  nome: string
  ordine: number
  attivo: boolean
}

export interface Cliente extends Models.Document {
  nome: string
  email?: string
  telefono?: string
  account_id?: string
  created_at: string
}

export interface Appuntamento extends Models.Document {
  cliente_id: string
  operatore_id: string
  data_ora_inizio: string
  durata_minuti: number
  stato: 'prenotato' | 'completato' | 'annullato'
  note?: string
  promemoria_offset_minuti: number
  promemoria_inviato?: string
  created_by: 'cliente' | 'admin'
  cliente_nome?: string
  servizi_nomi?: string
}

export interface OrarioLavoro extends Models.Document {
  operatore_id: string
  giorno_settimana: number
  ora_inizio: string
  ora_fine: string
  attivo: boolean
  data_specifica?: string
}

export interface Blocco extends Models.Document {
  operatore_id?: string
  tutto_salone: boolean
  data_ora_inizio: string
  data_ora_fine: string
  motivo?: string
  ricorrente: boolean
  giorno_settimana?: number
  eccezione_apertura: boolean
}

export interface PushSubscription extends Models.Document {
  account_id: string
  subscription: string
}
