import * as Sentry from '@sentry/react'

const isDev: boolean = import.meta.env.DEV

export function logError(context: string, error: unknown, extra: Record<string, unknown> = {}): void {
  if (isDev) {
    console.error(`[${context}]`, error, Object.keys(extra).length ? extra : '')
  }
  Sentry.captureException(error, { extra: { context, ...extra } })
}

export function logWarn(context: string, message: string, extra: Record<string, unknown> = {}): void {
  if (isDev) {
    console.warn(`[${context}] ${message}`, Object.keys(extra).length ? extra : '')
  }
}
