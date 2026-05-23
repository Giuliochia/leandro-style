import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { Query } from 'appwrite'
import { useOperatori } from '../../hooks/useOperatori'
import Spinner from '../../components/shared/Spinner'
import { STATI_CLASS, STATI_LABEL, formatOra } from '../../utils/appuntamenti'
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns'
import { it } from 'date-fns/locale'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { operatori, loading: loadingOp } = useOperatori()
  const [oggi, setOggi] = useState([])
  const [prossimi, setProssimi] = useState([])
  const [nomiClienti, setNomiClienti] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!operatori.length) return
    caricaDati()
  }, [operatori])

  const caricaDati = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const fineOggi = endOfDay(now)
      const tra7giorni = addDays(now, 7).toISOString()

      const [resOggi, resProssimi] = await Promise.all([
        databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
          Query.greaterThanEqual('data_ora_inizio', startOfDay(now).toISOString()),
          Query.lessThanEqual('data_ora_inizio', fineOggi.toISOString()),
          Query.equal('stato', 'prenotato'),
          Query.orderAsc('data_ora_inizio'),
          Query.limit(50),
        ]),
        databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
          Query.greaterThan('data_ora_inizio', fineOggi.toISOString()),
          Query.lessThanEqual('data_ora_inizio', tra7giorni),
          Query.equal('stato', 'prenotato'),
          Query.orderAsc('data_ora_inizio'),
          Query.limit(30),
        ]),
      ])

      setOggi(resOggi.documents)
      setProssimi(resProssimi.documents)

      // Usa cliente_nome denormalizzato — nessuna query aggiuntiva
      const map = {}
      ;[...resOggi.documents, ...resProssimi.documents].forEach(a => {
        if (a.cliente_nome) map[a.cliente_id] = { nome: a.cliente_nome }
      })
      setNomiClienti(map)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loadingOp || loading) return <div className="page-center"><Spinner /></div>

  const operatoreNome = (id) => operatori.find(o => o.$id === id)?.nome || ''
  const dataOggi = format(new Date(), "EEEE d MMMM", { locale: it })

  return (
    <div className="admin-dashboard">

      {/* Hero */}
      <div className="admin-hero">
        <div className="admin-hero__glow" />
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Pannello di controllo</p>
          <h1 className="admin-hero__title">Leandro's Style</h1>
          <p className="admin-hero__date">{dataOggi}</p>
        </div>
        <div className="admin-hero__stats">
          <div className="admin-stat">
            <span className="admin-stat__val">{oggi.length}</span>
            <span className="admin-stat__label">Oggi</span>
          </div>
          <div className="admin-stat__divider" />
          <div className="admin-stat">
            <span className="admin-stat__val">{prossimi.length}</span>
            <span className="admin-stat__label">Settimana</span>
          </div>
        </div>
      </div>

      <div className="admin-body">

        {/* Oggi */}
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              Oggi
              <span className="admin-section__count">{oggi.length}</span>
            </h2>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/admin/agenda')}>
              Agenda →
            </button>
          </div>

          {oggi.length === 0 ? (
            <div className="admin-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>Nessun appuntamento oggi</span>
            </div>
          ) : (
            <div className="admin-list">
              {oggi.map((a, i) => (
                <AppCard
                  key={a.$id}
                  app={a}
                  cliente={nomiClienti[a.cliente_id]}
                  operatoreNome={operatori.length > 1 ? operatoreNome(a.operatore_id) : null}
                  index={i}
                  onClick={() => navigate('/admin/agenda')}
                />
              ))}
            </div>
          )}
        </section>

        {/* Prossimi 7 giorni */}
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              Prossimi 7 giorni
              <span className="admin-section__count">{prossimi.length}</span>
            </h2>
          </div>

          {prossimi.length === 0 ? (
            <div className="admin-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>Nessun appuntamento in programma</span>
            </div>
          ) : (
            <div className="admin-list">
              {prossimi.map((a, i) => (
                <AppCard
                  key={a.$id}
                  app={a}
                  cliente={nomiClienti[a.cliente_id]}
                  operatoreNome={operatori.length > 1 ? operatoreNome(a.operatore_id) : null}
                  showData
                  index={i}
                  onClick={() => navigate('/admin/agenda')}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function AppCard({ app, cliente, operatoreNome, showData, index = 0, onClick }) {
  const dataOra = new Date(app.data_ora_inizio)

  const labelGiorno = () => {
    if (isToday(dataOra))    return 'Oggi'
    if (isTomorrow(dataOra)) return 'Domani'
    return format(dataOra, 'EEE d MMM', { locale: it })
  }

  return (
    <button
      className="admin-card"
      style={{ animationDelay: `${index * 55}ms` }}
      onClick={onClick}
    >
      <div className="admin-card__date">
        {showData
          ? <>
              <span className="admin-card__dow">{format(dataOra, 'EEE', { locale: it })}</span>
              <span className="admin-card__day">{format(dataOra, 'd')}</span>
              <span className="admin-card__mon">{format(dataOra, 'MMM', { locale: it })}</span>
            </>
          : <>
              <span className="admin-card__dow">ORE</span>
              <span className="admin-card__day" style={{ fontSize: '1.15rem' }}>{formatOra(app.data_ora_inizio)}</span>
              <span className="admin-card__mon">{app.durata_minuti}m</span>
            </>
        }
      </div>

      <div className="admin-card__body">
        <span className="admin-card__nome">{cliente?.nome || '…'}</span>
        <span className="admin-card__meta">
          {showData && <>{labelGiorno()} · {formatOra(app.data_ora_inizio)} · </>}
          {app.durata_minuti}min
          {cliente?.telefono && <> · {cliente.telefono}</>}
          {operatoreNome && <> · {operatoreNome}</>}
        </span>
      </div>

      <div className="admin-card__right">
        <span className={`app-badge app-badge--${app.stato}`}>{STATI_LABEL[app.stato]}</span>
      </div>
    </button>
  )
}
