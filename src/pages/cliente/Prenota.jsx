import { useState, useEffect, useReducer, useRef } from 'react'
import { useClienteNav } from '../../hooks/useClienteNav'
import { useLocation } from 'react-router-dom'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { logError } from '../../lib/logger'
import { Query } from 'appwrite'
import { useAuth } from '../../auth/AuthContext'
import { useServizi } from '../../hooks/useServizi'
import { useOperatori } from '../../hooks/useOperatori'
import { creaAppuntamento } from '../../hooks/useAppuntamenti'
import { calcolaGiorniDisponibili, calcolaSlotDisponibili, calcolaGiorniBlocchi } from '../../utils/disponibilita'
import Spinner from '../../components/shared/Spinner'
import { format, addDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isBefore, isAfter, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

const STEP_SERVIZIO  = 1
const STEP_OPERATORE = 2
const STEP_GIORNO    = 3
const STEP_ORA       = 4
const STEP_CONFERMA  = 5

const initialWizard = {
  step: STEP_SERVIZIO,
  servizioSel: null,
  operatoreSel: null,
  giornoSel: null,
  oraSel: null,
  promemoria: 60,
  errore: '',
  saving: false,
}

function wizardReducer(state, action) {
  switch (action.type) {
    case 'SELEZIONA_SERVIZIO':
      return { ...state, servizioSel: action.servizio, operatoreSel: null, giornoSel: null, oraSel: null, step: STEP_OPERATORE }
    case 'SELEZIONA_OPERATORE':
      return { ...state, operatoreSel: action.operatore, giornoSel: null, oraSel: null, step: STEP_GIORNO }
    case 'SELEZIONA_GIORNO':
      return { ...state, giornoSel: action.giorno, oraSel: null }
    case 'SELEZIONA_ORA':
      return { ...state, oraSel: action.ora }
    case 'SELEZIONA_PROMEMORIA':
      return { ...state, promemoria: action.value }
    case 'VAI_A_STEP':
      return { ...state, step: action.step }
    case 'SET_ERRORE':
      return { ...state, errore: action.msg }
    case 'SET_SAVING':
      return { ...state, saving: action.value }
    default:
      return state
  }
}

export default function Prenota() {
  const navigate = useClienteNav()
  const location = useLocation()
  const isPreview = location.pathname.startsWith('/admin/preview')
  const { user } = useAuth()
  const { servizi, loading: loadingServizi } = useServizi()
  const { operatori, loading: loadingOp } = useOperatori()

  const [wizard, dispatch] = useReducer(wizardReducer, initialWizard)
  const { step, servizioSel, operatoreSel, giornoSel, oraSel, promemoria, errore, saving } = wizard

  const [giorniDisp, setGiorniDisp] = useState([])
  const [giorniBlocchi, setGiorniBlocchi] = useState([])
  const [loadingGiorni, setLoadingGiorni] = useState(false)
  const [meseCorrente, setMeseCorrente] = useState(() => startOfMonth(new Date()))
  const [slotsDisp, setSlotsDisp] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [clienteId, setClienteId] = useState(null)

  const footerRef = useRef(null)
  const confermaInCorso = useRef(false)

  const operatoriAttivi = operatori.filter(o => o.attivo)

  // Recupera l'id scheda cliente dall'account corrente
  useEffect(() => {
    if (!user) return
    databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [
      Query.equal('account_id', user.$id),
      Query.limit(1),
    ]).then(res => {
      if (res.documents.length) {
        setClienteId(res.documents[0].$id)
      } else if (isPreview) {
        return databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [Query.limit(1)])
          .then(r => { if (r.documents.length) setClienteId(r.documents[0].$id) })
      }
    }).catch(e => logError('Prenota/loadClienteId', e, { userId: user?.$id }))
  }, [user, isPreview])

  const operatoreEffettivo = operatoreSel

  useEffect(() => {
    if (step !== STEP_GIORNO || !servizioSel || !operatoreEffettivo) return
    setLoadingGiorni(true)
    setGiorniDisp([])
    setGiorniBlocchi([])
    const da = new Date()
    da.setHours(0, 0, 0, 0)
    const a = addDays(da, 150) // ~5 mesi
    Promise.all([
      calcolaGiorniDisponibili(operatoreEffettivo.$id, servizioSel.durata_minuti, da, a),
      calcolaGiorniBlocchi(operatoreEffettivo.$id, servizioSel.durata_minuti, da, a),
    ])
      .then(([giorni, blocchi]) => { setGiorniDisp(giorni); setGiorniBlocchi(blocchi) })
      .catch(e => dispatch({ type: 'SET_ERRORE', msg: e.message }))
      .finally(() => setLoadingGiorni(false))
  }, [step, servizioSel, operatoreEffettivo])

  useEffect(() => {
    if (step !== STEP_ORA || !giornoSel || !servizioSel || !operatoreEffettivo) return
    setLoadingSlots(true)
    setSlotsDisp([])
    calcolaSlotDisponibili(operatoreEffettivo.$id, giornoSel, servizioSel.durata_minuti)
      .then(slots => setSlotsDisp(slots))
      .catch(e => dispatch({ type: 'SET_ERRORE', msg: e.message }))
      .finally(() => setLoadingSlots(false))
  }, [step, giornoSel, servizioSel, operatoreEffettivo])

  const conferma = async () => {
    if (confermaInCorso.current) return
    if (!clienteId || !operatoreEffettivo || !servizioSel || !oraSel) {
      dispatch({ type: 'SET_ERRORE', msg: 'Dati mancanti. Riprova.' })
      return
    }
    confermaInCorso.current = true
    dispatch({ type: 'SET_SAVING', value: true })
    dispatch({ type: 'SET_ERRORE', msg: '' })
    try {
      await creaAppuntamento({
        clienteId,
        operatoreId: operatoreEffettivo.$id,
        dataOraInizio: oraSel.toISOString(),
        durataMinuti: servizioSel.durata_minuti,
        serviziIds: [servizioSel.$id],
        note: '',
        promemoria,
        createdBy: 'cliente',
        accountId: user?.$id,
      })
      navigate('/appuntamenti')
    } catch (e) {
      confermaInCorso.current = false
      dispatch({ type: 'SET_ERRORE', msg: 'Errore durante la prenotazione. Riprova.' })
      dispatch({ type: 'SET_SAVING', value: false })
    }
  }

  if (loadingServizi || loadingOp) return <div className="page-center"><Spinner /></div>
  if (!operatoriAttivi.length) return <div className="page"><div className="alert alert--warning">Nessun operatore disponibile.</div></div>

  const serviziAttivi = servizi.filter(s => s.attivo)

  const stepsLabel = ['Servizio', 'Barbiere', 'Giorno', 'Orario', 'Conferma']
  const stepToIndex = { [STEP_SERVIZIO]: 0, [STEP_OPERATORE]: 1, [STEP_GIORNO]: 2, [STEP_ORA]: 3, [STEP_CONFERMA]: 4 }
  const stepIndex = stepToIndex[step] ?? 0

  return (
    <div className="page">
      {isPreview && (
        <div className="alert alert--info mb-3" style={{ fontSize: '.82rem' }}>
          👁️ Anteprima admin — prenotazione reale sul primo cliente disponibile
        </div>
      )}
      {/* Progress bar */}
      <div className="prenota-progress">
        {stepsLabel.map((label, i) => (
          <div key={i} className={`prenota-progress__step ${stepIndex === i ? 'prenota-progress__step--active' : ''} ${stepIndex > i ? 'prenota-progress__step--done' : ''}`}>
            <div className="prenota-progress__dot">{stepIndex > i ? '✓' : i + 1}</div>
            <span className="prenota-progress__label">{label}</span>
          </div>
        ))}
      </div>

      {errore && <div className="alert alert--error mb-3">{errore}</div>}

      {/* Step 1 — Scegli servizio */}
      {step === STEP_SERVIZIO && (
        <div className="prenota-step">
          <h2 className="prenota-step__title">Che servizio vuoi?</h2>
          <div className="prenota-servizi">
            {serviziAttivi.map(s => (
              <button
                key={s.$id}
                className={`prenota-servizio-card ${servizioSel?.$id === s.$id ? 'prenota-servizio-card--sel' : ''}`}
                onClick={() => { dispatch({ type: 'SELEZIONA_SERVIZIO', servizio: s }); setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }}
              >
                <span className="prenota-servizio-card__nome">{s.nome}</span>
                <span className="prenota-servizio-card__meta">{s.durata_minuti} min · {s.prezzo ? `€${s.prezzo}` : ''}</span>
                {s.descrizione && <span className="prenota-servizio-card__desc">{s.descrizione}</span>}
              </button>
            ))}
          </div>
          <div className="prenota-footer" ref={footerRef}>
            <button
              className="btn btn--primary btn--full"
              disabled={!servizioSel}
              onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_OPERATORE })}
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Scegli operatore (solo se più di uno) */}
      {step === STEP_OPERATORE && (
        <div className="prenota-step">
          <button className="prenota-back" onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_SERVIZIO })}>← {servizioSel.nome}</button>
          <h2 className="prenota-step__title">Scegli il barbiere</h2>
          <div className="prenota-servizi">
            {operatoriAttivi.map(op => (
              <button
                key={op.$id}
                className={`prenota-servizio-card ${operatoreSel?.$id === op.$id ? 'prenota-servizio-card--sel' : ''}`}
                onClick={() => { dispatch({ type: 'SELEZIONA_OPERATORE', operatore: op }); setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }}
              >
                <span className="prenota-servizio-card__nome">{op.nome}</span>
              </button>
            ))}
          </div>
          <div className="prenota-footer" ref={footerRef}>
            <button
              className="btn btn--primary btn--full"
              disabled={!operatoreSel}
              onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_GIORNO })}
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Scegli giorno */}
      {step === STEP_GIORNO && (
        <div className="prenota-step">
          <button className="prenota-back" onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_OPERATORE })}>
            ← {operatoreEffettivo?.nome}
          </button>
          <h2 className="prenota-step__title">Scegli il giorno</h2>

          {loadingGiorni ? (
            <div className="page-center"><Spinner /></div>
          ) : (
            <CalendarioMese
              mese={meseCorrente}
              giorniDisp={giorniDisp}
              giorniBlocchi={giorniBlocchi}
              giornoSel={giornoSel}
              onGiornoSel={(g) => { dispatch({ type: 'SELEZIONA_GIORNO', giorno: g }); setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80) }}
              onMesePrev={() => setMeseCorrente(m => subMonths(m, 1))}
              onMeseNext={() => setMeseCorrente(m => addMonths(m, 1))}
            />
          )}

          <div className="prenota-footer" ref={footerRef}>
            <button
              className="btn btn--primary btn--full"
              disabled={!giornoSel}
              onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_ORA })}
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Scegli orario */}
      {step === STEP_ORA && (
        <div className="prenota-step">
          <button className="prenota-back" onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_GIORNO })}>← {format(giornoSel, 'EEEE d MMMM', { locale: it })}</button>
          <h2 className="prenota-step__title">Scegli l'orario</h2>
          {loadingSlots ? (
            <div className="page-center"><Spinner /></div>
          ) : slotsDisp.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🕐</div>
              <div className="empty-state__title">Nessun orario disponibile</div>
              <div className="empty-state__desc">Tutti gli slot sono occupati per questo giorno.</div>
              <button className="btn btn--outline mt-3" onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_GIORNO })}>Cambia giorno</button>
            </div>
          ) : (
            <div className="prenota-slots">
              {slotsDisp.map((slot, i) => (
                <button
                  key={i}
                  className={`prenota-slot ${oraSel && slot.getTime() === oraSel.getTime() ? 'prenota-slot--sel' : ''}`}
                  onClick={() => { dispatch({ type: 'SELEZIONA_ORA', ora: slot }); setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }}
                >
                  {format(slot, 'HH:mm')}
                </button>
              ))}
            </div>
          )}
          <div className="prenota-footer" ref={footerRef}>
            <button
              className="btn btn--primary btn--full"
              disabled={!oraSel}
              onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_CONFERMA })}
            >
              Continua
            </button>
          </div>
        </div>
      )}

      {/* Step 5 — Conferma */}
      {step === STEP_CONFERMA && (
        <div className="prenota-step">
          <button className="prenota-back" onClick={() => dispatch({ type: 'VAI_A_STEP', step: STEP_ORA })}>← Cambia orario</button>
          <h2 className="prenota-step__title">Conferma prenotazione</h2>
          <div className="prenota-riepilogo">
            <div className="prenota-riepilogo__row">
              <span className="prenota-riepilogo__label">Servizio</span>
              <span className="prenota-riepilogo__val">{servizioSel.nome}</span>
            </div>
            <div className="prenota-riepilogo__row">
              <span className="prenota-riepilogo__label">Barbiere</span>
              <span className="prenota-riepilogo__val">{operatoreEffettivo?.nome}</span>
            </div>
            <div className="prenota-riepilogo__row">
              <span className="prenota-riepilogo__label">Durata</span>
              <span className="prenota-riepilogo__val">{servizioSel.durata_minuti} minuti</span>
            </div>
            {servizioSel.prezzo && (
              <div className="prenota-riepilogo__row">
                <span className="prenota-riepilogo__label">Prezzo</span>
                <span className="prenota-riepilogo__val">€{servizioSel.prezzo}</span>
              </div>
            )}
            <div className="prenota-riepilogo__row">
              <span className="prenota-riepilogo__label">Data</span>
              <span className="prenota-riepilogo__val">{format(giornoSel, 'EEEE d MMMM yyyy', { locale: it })}</span>
            </div>
            <div className="prenota-riepilogo__row">
              <span className="prenota-riepilogo__label">Orario</span>
              <span className="prenota-riepilogo__val prenota-riepilogo__val--big">{format(oraSel, 'HH:mm')}</span>
            </div>
          </div>

          {/* Selettore promemoria */}
          <div className="prenota-promemoria">
            <span className="prenota-promemoria__label">🔔 Ricordamelo</span>
            <div className="prenota-promemoria__opzioni">
              {[
                { label: '30 min prima', value: 30 },
                { label: '1 ora prima', value: 60 },
                { label: '2 ore prima', value: 120 },
                { label: '1 giorno prima', value: 1440 },
              ].map(o => (
                <button
                  key={o.value}
                  className={`prenota-promemoria__btn ${promemoria === o.value ? 'prenota-promemoria__btn--sel' : ''}`}
                  onClick={() => dispatch({ type: 'SELEZIONA_PROMEMORIA', value: o.value })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="prenota-footer">
            <button
              className="btn btn--primary btn--full"
              onClick={conferma}
              disabled={saving}
            >
              {saving ? 'Prenotazione in corso…' : 'Conferma prenotazione'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const GIORNI_HEADER = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function CalendarioMese({ mese, giorniDisp, giorniBlocchi, giornoSel, onGiornoSel, onMesePrev, onMeseNext }) {
  const oggi = startOfDay(new Date())
  const meseMin = startOfMonth(oggi)

  // Celle del calendario: dalla prima settimana (lun) all'ultima (dom)
  const primoDelMese = startOfMonth(mese)
  const ultimoDelMese = endOfMonth(mese)
  const inizio = startOfWeek(primoDelMese, { weekStartsOn: 1 })
  const fine   = endOfWeek(ultimoDelMese,  { weekStartsOn: 1 })

  const celle = []
  let cur = new Date(inizio)
  while (!isAfter(cur, fine)) {
    celle.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  const dispSet   = new Set(giorniDisp.map(d => format(d, 'yyyy-MM-dd')))
  const bloccoMap = Object.fromEntries(giorniBlocchi.map(b => [format(b.data, 'yyyy-MM-dd'), b.motivo]))

  const meseLabel = format(mese, 'MMMM yyyy', { locale: it })
  const isPrevDisabled = !isAfter(mese, meseMin)

  return (
    <div className="cal-mese">
      {/* Navigazione mese */}
      <div className="cal-mese__nav">
        <button className="cal-mese__arrow" onClick={onMesePrev} disabled={isPrevDisabled}>‹</button>
        <span className="cal-mese__label">{meseLabel}</span>
        <button className="cal-mese__arrow" onClick={onMeseNext}>›</button>
      </div>

      {/* Header giorni settimana */}
      <div className="cal-mese__header">
        {GIORNI_HEADER.map(g => (
          <span key={g} className="cal-mese__dow">{g}</span>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="cal-mese__grid">
        {celle.map((giorno, i) => {
          const key = format(giorno, 'yyyy-MM-dd')
          const delMese = giorno.getMonth() === mese.getMonth()
          const passato = isBefore(giorno, oggi)
          const disponibile = dispSet.has(key)
          const bloccato = key in bloccoMap
          const selezionato = giornoSel && isSameDay(giorno, giornoSel)

          if (!delMese) return <div key={i} className="cal-mese__cella cal-mese__cella--vuota" />

          if (passato || (!disponibile && !bloccato)) {
            return (
              <div key={i} className="cal-mese__cella cal-mese__cella--inattivo">
                <span>{format(giorno, 'd')}</span>
              </div>
            )
          }

          if (bloccato) {
            return (
              <div key={i} className="cal-mese__cella cal-mese__cella--bloccato" title={bloccoMap[key] || 'Chiuso'}>
                <span>{format(giorno, 'd')}</span>
                <span className="cal-mese__x">✕</span>
              </div>
            )
          }

          return (
            <button
              key={i}
              className={`cal-mese__cella cal-mese__cella--disp ${selezionato ? 'cal-mese__cella--sel' : ''}`}
              onClick={() => onGiornoSel(giorno)}
            >
              <span>{format(giorno, 'd')}</span>
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="cal-mese__legenda">
        <span className="cal-mese__legenda-item cal-mese__legenda-item--disp">Disponibile</span>
        <span className="cal-mese__legenda-item cal-mese__legenda-item--bloccato">Chiuso</span>
      </div>
    </div>
  )
}
