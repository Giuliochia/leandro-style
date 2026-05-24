import { useState, useEffect } from 'react'
import { useClienteNav } from '../../hooks/useClienteNav'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { Query } from 'appwrite'
import { logError } from '../../lib/logger'
import { useAuth } from '../../auth/AuthContext'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import Spinner from '../../components/shared/Spinner'
import { format, differenceInHours, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'

function CountdownBadge({ dataOra }) {
  const now = new Date()
  const ore = differenceInHours(dataOra, now)
  const giorni = differenceInDays(dataOra, now)
  if (ore < 1) return <span className="countdown-badge countdown-badge--soon">Tra poco</span>
  if (ore < 24) return <span className="countdown-badge countdown-badge--today">Oggi · tra {ore}h</span>
  if (giorni === 1) return <span className="countdown-badge">Domani</span>
  return <span className="countdown-badge">Tra {giorni} giorni</span>
}

export default function ClienteDashboard() {
  const navigate = useClienteNav()
  const { user } = useAuth()
  const [clienteId, setClienteId] = useState(null)
  const [nomeCliente, setNomeCliente] = useState('')
  const [prossimo, setProssimo] = useState(null)
  const [serviziProssimo, setServiziProssimo] = useState([])
  const [loading, setLoading] = useState(true)

  const { permesso, subscribed, loading: loadingPush, chiediPermesso } = usePushNotifications('cliente')

  useEffect(() => {
    if (!user) return
    databases.listDocuments(DB_ID, COLLECTIONS.CLIENTI, [
      Query.equal('account_id', user.$id),
      Query.limit(1),
    ]).then(async res => {
      if (!res.documents.length) { setLoading(false); return }
      const cliente = res.documents[0]
      setClienteId(cliente.$id)
      setNomeCliente(cliente.nome)
      const apps = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
        Query.equal('cliente_id', cliente.$id),
        Query.equal('stato', 'prenotato'),
        Query.greaterThanEqual('data_ora_inizio', new Date().toISOString()),
        Query.orderAsc('data_ora_inizio'),
        Query.limit(1),
      ])
      if (apps.documents.length) {
        const app = apps.documents[0]
        setProssimo(app)
        setServiziProssimo(app.servizi_nomi ? app.servizi_nomi.split(', ') : [])
      }
    }).catch(e => logError('Dashboard/loadProssimoAppuntamento', e, { userId: user?.$id }))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-center"><Spinner /></div>

  const nome = nomeCliente ? nomeCliente.split(' ')[0] : ''
  const mostraBannerPush = clienteId && permesso === 'default' && !subscribed
  const dataOra = prossimo ? new Date(prossimo.data_ora_inizio) : null

  return (
    <div className="dashboard">

      {/* Hero */}
      <div className="dashboard__hero">
        <div className="dashboard__hero-glow" />
        <img src="/logo.png" alt="Leandro's Style" className="dashboard__logo" />
        <p className="dashboard__greeting">Bentornato</p>
        <h1 className="dashboard__name">{nome || 'Cliente'}</h1>
      </div>

      <div className="dashboard__body">

        {/* Banner push */}
        {mostraBannerPush && (
          <div className="push-banner" style={{ animationDelay: '100ms' }}>
            <div className="push-banner__text">
              <strong>Attiva i promemoria</strong>
              <span>Ricevi una notifica prima del tuo appuntamento</span>
            </div>
            <button className="btn btn--accent btn--sm" onClick={chiediPermesso} disabled={loadingPush}>
              {loadingPush ? '…' : 'Attiva'}
            </button>
          </div>
        )}

        {/* Card prossimo appuntamento */}
        {prossimo ? (
          <div className="next-app-card" onClick={() => navigate('/appuntamenti')} role="button" tabIndex={0}>
            <div className="next-app-card__header">
              <span className="next-app-card__eyebrow">Prossimo appuntamento</span>
              {dataOra && <CountdownBadge dataOra={dataOra} />}
            </div>
            <div className="next-app-card__time">
              {format(dataOra, 'HH:mm')}
            </div>
            <div className="next-app-card__date">
              {format(dataOra, 'EEEE d MMMM', { locale: it })}
            </div>
            {serviziProssimo.length > 0 && (
              <div className="next-app-card__service">{serviziProssimo.join(' · ')}</div>
            )}
            <div className="next-app-card__arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="no-app-card">
            <div className="no-app-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="no-app-card__title">Nessun appuntamento</p>
            <p className="no-app-card__sub">Prenota il tuo prossimo taglio</p>
          </div>
        )}

        {/* Actions */}
        <div className="dashboard__actions">
          <button className="dash-action dash-action--primary" onClick={() => navigate('/prenota')}>
            <span className="dash-action__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8.5" y1="8.5" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8.5" y1="15.5" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="8" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="dash-action__label">Prenota</span>
            <span className="dash-action__sub">Nuovo appuntamento</span>
          </button>
          <button className="dash-action" onClick={() => navigate('/appuntamenti')}>
            <span className="dash-action__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="15" r="1" fill="currentColor"/>
                <circle cx="12" cy="15" r="1" fill="currentColor"/>
                <circle cx="16" cy="15" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span className="dash-action__label">Agenda</span>
            <span className="dash-action__sub">I tuoi appuntamenti</span>
          </button>
        </div>

      </div>
    </div>
  )
}
