import { formatInTimeZone } from 'date-fns-tz'

export const TZ = 'Europe/Rome'

export function formatOra(isoString) {
  return formatInTimeZone(new Date(isoString), TZ, 'HH:mm')
}

export function formatDataOra(isoString) {
  return formatInTimeZone(new Date(isoString), TZ, 'dd MMM yyyy HH:mm')
}

export const STATI_LABEL = {
  prenotato: 'Prenotato',
  completato: 'Completato',
  annullato: 'Annullato',
  no_show: 'No show',
}

export const STATI_CLASS = {
  prenotato: 'badge--blue',
  completato: 'badge--green',
  annullato: 'badge--gray',
  no_show: 'badge--red',
}

export const STATI_NEXT = {
  prenotato: ['completato', 'no_show', 'annullato'],
  completato: [],
  annullato: [],
  no_show: [],
}
