---
name: project-codereview-progress
description: Stato avanzamento della code review architetturale di Leandro Style
metadata:
  type: project
---

Stiamo eseguendo una code review sistematica del progetto Leandro Style (gestionale salone, React+Vite+Appwrite).

**Why:** migliorare robustezza, performance, sicurezza e manutenibilità prima che il salone vada in produzione attiva.

**How to apply:** alla prossima sessione riprendere dall'elemento successivo nella lista.

## Lista interventi (in ordine di priorità)

- [x] 1. Indice UNIQUE su `email` in Appwrite + fix `fetchClienteByEmail` server-side
- [x] 2. Compensating transaction in `aggiornaAppuntamento` (crea nuovi prima di cancellare vecchi)
- [x] 3. Eliminazione N+1 queries in Agenda.jsx — denormalizzazione `cliente_nome` e `servizi_nomi` su appuntamenti
- [x] 4. Stato esplicito `clienteStatus` ('loading'|'missing'|'loaded') in AuthContext + ProtectedRoute
- [x] 5. Logger centralizzato `src/lib/logger.js` — rimossi catch silenziosi nei file critici
- [x] **Sentry** — integrato in `src/lib/logger.js` e `src/main.jsx` (disabled se VITE_SENTRY_DSN è vuoto)
- [ ] **PROSSIMO: 6.** Flag `promemoria_inviato` sulla Cloud Function `promemoria-push` (idempotenza)
- [x] 7. `useReducer` per wizard Prenota.jsx
- [x] 8. Eliminare magic number `30` da disponibilita.js — sostituito con costante `SLOT_STEP_MINUTI`
- [x] 9. TypeScript graduale sui file core — `config.ts` e `logger.ts` convertiti, `tsconfig.json` con `allowJs: true` per coesistenza con i file JS restanti

## Note tecniche

- `cliente_nome` e `servizi_nomi` sono colonne String (non array) su Appwrite — il codice fa join/split con ', '
- Il logger è pronto per Sentry: basta aggiungere `Sentry.captureException` dentro `logError`
- `clienteStatus` è esposto nel context value — ProtectedRoute lo usa direttamente
