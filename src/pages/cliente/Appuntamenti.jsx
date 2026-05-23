import { useState, useEffect, useMemo } from 'react'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { Query } from 'appwrite'
import { useAuth } from '../../auth/AuthContext'
import { useClienteNav } from '../../hooks/useClienteNav'
import Spinner from '../../components/shared/Spinner'
import { STATI_LABEL, STATI_CLASS } from '../../utils/appuntamenti'
import { format, isBefore, addHours } from 'date-fns'
import { it } from 'date-fns/locale'

export default function MieiAppuntamenti() {
  const { user } = useAuth()
  const navigate = useClienteNav()
  const [clienteId, setClienteId] = useState(null)
  const [appuntamenti, setAppuntamenti] = useState([])
  const [nomiServizi, setNomiServizi] = useState({})
  const [loading, setLoading] = useState(true)
  const [confirmAnnulla, setConfirmAnnulla] = useState(null)
  const [motivoAnnullo, setMotivoAnnullo] = useState('')
  const [annullando, setAnnullando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (!user) return
    databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [
      Query.equal('account_id', user.$id),
      Query.limit(1),
    ]).then(res => {
      if (res.documents.length) setClienteId(res.documents[0].$id)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
      Query.equal('cliente_id', clienteId),
      Query.orderDesc('data_ora_inizio'),
      Query.limit(100),
    ]).then(async res => {
      setAppuntamenti(res.documents)
      const map = {}
      await Promise.all(res.documents.map(async a => {
        const s = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTO_SERVIZI, [
          Query.equal('appuntamento_id', a.$id),
          Query.limit(10),
        ])
        const nomi = await Promise.all(s.documents.map(d =>
          databases.getDocument(DB_ID, COLLECTIONS.SERVIZI, d.servizio_id).then(d => d.nome).catch(() => '')
        ))
        map[a.$id] = nomi.filter(Boolean)
      }))
      setNomiServizi(map)
    }).catch(e => setErrore(e.message))
      .finally(() => setLoading(false))
  }, [clienteId])

  const ORE_MIN_CANCELLAZIONE = 24

  const puoAnnullare = (app) => {
    if (app.stato !== 'prenotato') return false
    // Deve essere almeno ORE_MIN_CANCELLAZIONE ore prima dell'inizio
    return isBefore(addHours(new Date(), ORE_MIN_CANCELLAZIONE), new Date(app.data_ora_inizio))
  }

  const annulla = async () => {
    if (!confirmAnnulla) return
    setAnnullando(true)
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, confirmAnnulla, {
        stato: 'annullato',
        ...(motivoAnnullo.trim() ? { note: motivoAnnullo.trim().slice(0, 500) } : {}),
      })
      setAppuntamenti(prev => prev.map(a => a.$id === confirmAnnulla ? { ...a, stato: 'annullato' } : a))
      setConfirmAnnulla(null)
      setMotivoAnnullo('')
    } catch {
      setErrore("Errore durante l'annullamento.")
    } finally {
      setAnnullando(false)
    }
  }

  const [mostraStorico, setMostraStorico] = useState(false)

  if (loading) return <div className="page-center"><Spinner /></div>

  const now = new Date()
  const prossimi = appuntamenti.filter(a => a.stato === 'prenotato' && !isBefore(new Date(a.data_ora_inizio), now))
  const passati  = appuntamenti.filter(a => a.stato !== 'prenotato' || isBefore(new Date(a.data_ora_inizio), now))

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page__title">Agenda</h1>
        <button className="btn btn--accent btn--sm" onClick={() => navigate('/prenota')}>+ Prenota</button>
      </div>

      {errore && <div className="alert alert--error mb-3">{errore}</div>}

      {appuntamenti.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="empty-state__title">Nessun appuntamento</div>
          <div className="empty-state__desc">Non hai ancora prenotato nulla.</div>
          <button className="btn btn--primary mt-3" onClick={() => navigate('/prenota')}>Prenota ora</button>
        </div>
      ) : (
        <>
          {prossimi.length > 0 && (
            <section className="app-section">
              <h2 className="app-section__title">In arrivo</h2>
              <div className="app-list">
                {prossimi.map((a, i) => (
                  <AppCard key={a.$id} app={a} servizi={nomiServizi[a.$id]} index={i}
                    onAnnulla={puoAnnullare(a) ? () => setConfirmAnnulla(a.$id) : null}
                    troppoTardi={a.stato === 'prenotato' && !puoAnnullare(a)} />
                ))}
              </div>
            </section>
          )}
          {passati.length > 0 && (
            <section className="app-section">
              <button className="app-section__toggle" onClick={() => setMostraStorico(v => !v)}>
                <h2 className="app-section__title">Storico ({passati.length})</h2>
                <span className="app-section__chevron">{mostraStorico ? '▲' : '▼'}</span>
              </button>
              {mostraStorico && (
                <div className="app-list mt-2">
                  {passati.map((a, i) => (
                    <AppCard key={a.$id} app={a} servizi={nomiServizi[a.$id]} index={i} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {confirmAnnulla && (
        <div className="modal-overlay" onClick={() => setConfirmAnnulla(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <span className="modal__title">Annulla prenotazione</span>
              <button className="modal__close" onClick={() => setConfirmAnnulla(null)}>✕</button>
            </div>
            <div className="modal__body">
              <p>Sei sicuro di voler annullare questo appuntamento?</p>
              <p className="text-muted" style={{ fontSize: '.85rem', marginTop: '.5rem' }}>
                Questa azione non può essere annullata.
              </p>
              <textarea
                className="input-group__field mt-3"
                rows={3}
                placeholder="Motivo (opzionale)…"
                value={motivoAnnullo}
                onChange={e => setMotivoAnnullo(e.target.value)}
              />
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setConfirmAnnulla(null)}>No, tieni</button>
              <button className="btn btn--danger" onClick={annulla} disabled={annullando}>
                {annullando ? 'Annullamento…' : 'Sì, annulla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppCard({ app, servizi, onAnnulla, troppoTardi = false, index = 0 }) {
  const dataOra = new Date(app.data_ora_inizio)
  const isProssimo = app.stato === 'prenotato' && !isBefore(dataOra, new Date())

  return (
    <div
      className={`app-card app-card--${app.stato} ${isProssimo ? 'app-card--prossimo' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="app-card__date">
        <span className="app-card__dow">{format(dataOra, 'EEE', { locale: it })}</span>
        <span className="app-card__day">{format(dataOra, 'd')}</span>
        <span className="app-card__mon">{format(dataOra, 'MMM', { locale: it })}</span>
      </div>

      <div className="app-card__body">
        <span className="app-card__service">{servizi?.join(' · ') || '…'}</span>
        <span className="app-card__time">{format(dataOra, 'HH:mm')} · {app.durata_minuti} min</span>
      </div>

      <div className="app-card__right">
        <span className={`app-badge app-badge--${app.stato}`}>{STATI_LABEL[app.stato]}</span>
        {onAnnulla && (
          <button className="app-card__cancel" onClick={onAnnulla}>Disdici</button>
        )}
        {troppoTardi && (
          <span className="app-card__no-cancel">Non disdibile</span>
        )}
      </div>
    </div>
  )
}
