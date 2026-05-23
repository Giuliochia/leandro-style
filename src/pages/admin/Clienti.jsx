import { useState } from 'react'
import { useClienti, useCliente } from '../../hooks/useClienti'
import Button from '../../components/shared/Button'
import InfoTooltip from '../../components/shared/InfoTooltip'
import Modal from '../../components/shared/Modal'
import Input from '../../components/shared/Input'
import EmptyState from '../../components/shared/EmptyState'
import Spinner from '../../components/shared/Spinner'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const STATI_LABEL = {
  prenotato: 'Prenotato',
  completato: 'Completato',
  annullato: 'Annullato',
  no_show: 'No show',
}

const STATI_CLASS = {
  prenotato: 'badge--blue',
  completato: 'badge--green',
  annullato: 'badge--gray',
  no_show: 'badge--red',
}

export default function Clienti() {
  const [cerca, setCerca] = useState('')
  const { clienti, loading, error, crea } = useClienti({ cerca })
  const [dettaglioId, setDettaglioId] = useState(null)
  const [modalCrea, setModalCrea] = useState(false)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page__title">Clienti <InfoTooltip testo={"Lista di tutti i clienti del salone.\n\n• Cerca per nome o numero di telefono.\n• Clicca su un cliente per vedere i suoi dati, aggiungere note interne e consultare lo storico degli appuntamenti.\n• Con '+ Nuovo' puoi registrare manualmente un cliente (es. chi prenota per telefono)."} /></h1>
        <Button variant="accent" onClick={() => setModalCrea(true)}>+ Nuovo</Button>
      </div>

      <Input
        placeholder="Cerca per nome o telefono…"
        value={cerca}
        onChange={e => setCerca(e.target.value)}
        className="search-input"
      />

      {error && <div className="alert alert--error mt-3">{error}</div>}

      {loading ? (
        <div className="page-center"><Spinner /></div>
      ) : clienti.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nessun cliente trovato"
          description={cerca ? 'Prova con un altro nome o telefono.' : 'I clienti appariranno qui dopo la registrazione o quando li crei manualmente.'}
        />
      ) : (
        <div className="list mt-3">
          {clienti.map(c => (
            <button
              key={c.$id}
              className="list-item list-item--clickable"
              onClick={() => setDettaglioId(c.$id)}
            >
              <div className="list-item__avatar">{c.nome[0].toUpperCase()}</div>
              <div className="list-item__content">
                <span className="list-item__title">{c.nome}</span>
                <span className="list-item__meta">
                  {c.telefono || '—'}
                  {!c.account_id && <span className="badge badge--gray ml-2">Telefono</span>}
                </span>
              </div>
              <span className="list-item__chevron">›</span>
            </button>
          ))}
        </div>
      )}

      {dettaglioId && (
        <DettaglioCliente
          id={dettaglioId}
          onClose={() => setDettaglioId(null)}
        />
      )}

      {modalCrea && (
        <ModalCreaCliente
          onClose={() => setModalCrea(false)}
          onCrea={async (data) => { await crea(data); setModalCrea(false) }}
        />
      )}
    </div>
  )
}

function DettaglioCliente({ id, onClose }) {
  const { cliente, appuntamenti, loading, error, aggiorna } = useCliente(id)
  const [editNote, setEditNote] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const apriNote = () => { setNote(cliente?.note || ''); setEditNote(true) }

  const salvaNota = async () => {
    setSaving(true)
    try {
      await aggiorna({ note })
      setEditNote(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Scheda cliente" onClose={onClose}>
      {loading && <div className="page-center"><Spinner /></div>}
      {error && <div className="alert alert--error">{error}</div>}
      {cliente && (
        <div className="form-stack">
          <div className="detail-row">
            <span className="detail-row__label">Nome</span>
            <span className="detail-row__value">{cliente.nome}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Telefono</span>
            <span className="detail-row__value">{cliente.telefono || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Email</span>
            <span className="detail-row__value">{cliente.email || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Tipo</span>
            <span className="detail-row__value">
              {cliente.account_id
                ? <span className="badge badge--blue">App</span>
                : <span className="badge badge--gray">Telefono</span>}
            </span>
          </div>

          <div className="detail-section">
            <div className="detail-section__header">
              <span className="detail-section__title">Note interne</span>
              <button className="icon-btn" onClick={apriNote}>✏️</button>
            </div>
            {editNote ? (
              <div className="form-stack">
                <textarea
                  className="input-group__field"
                  rows={4}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Note visibili solo all'admin…"
                />
                <div className="row-actions">
                  <Button variant="ghost" onClick={() => setEditNote(false)}>Annulla</Button>
                  <Button variant="accent" onClick={salvaNota} loading={saving}>Salva</Button>
                </div>
              </div>
            ) : (
              <p className="detail-note">{cliente.note || <span className="text-muted">Nessuna nota.</span>}</p>
            )}
          </div>

          <ServizioStorico appuntamenti={appuntamenti} />
        </div>
      )}
    </Modal>
  )
}

function ServizioStorico({ appuntamenti }) {
  const completati = appuntamenti.filter(a => a.stato === 'completato')

  // Conteggio servizi da campo denormalizzato
  const conteggioServizi = {}
  completati.forEach(a => {
    if (!a.servizi_nomi) return
    a.servizi_nomi.split(', ').forEach(nome => {
      if (nome) conteggioServizi[nome] = (conteggioServizi[nome] || 0) + 1
    })
  })
  const serviziOrdinati = Object.entries(conteggioServizi).sort((a, b) => b[1] - a[1])

  return (
    <>
      {serviziOrdinati.length > 0 && (
        <div className="detail-section">
          <span className="detail-section__title">Servizi più richiesti</span>
          <div className="servizi-storico mt-2">
            {serviziOrdinati.map(([nome, count]) => (
              <div key={nome} className="servizi-storico__row">
                <span className="servizi-storico__nome">{nome}</span>
                <span className="badge badge--blue">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <span className="detail-section__title">Storico appuntamenti ({appuntamenti.length})</span>
        {appuntamenti.length === 0 ? (
          <p className="text-muted">Nessun appuntamento.</p>
        ) : (
          <div className="list mt-2">
            {appuntamenti.map(a => (
              <div key={a.$id} className="list-item list-item--sm">
                <div className="list-item__content">
                  <span className="list-item__title">
                    {format(new Date(a.data_ora_inizio), 'dd MMM yyyy HH:mm', { locale: it })}
                  </span>
                  <span className="list-item__meta">
                    {a.servizi_nomi || '—'} · {a.durata_minuti} min
                  </span>
                </div>
                <span className={`badge ${STATI_CLASS[a.stato]}`}>{STATI_LABEL[a.stato]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ModalCreaCliente({ onClose, onCrea }) {
  const [form, setForm] = useState({ nome: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Il nome è obbligatorio.'); return }
    if (!form.telefono.trim()) { setError('Il telefono è obbligatorio.'); return }
    setSaving(true)
    setError('')
    try {
      await onCrea({ nome: form.nome.trim(), telefono: form.telefono.trim(), email: form.email.trim() })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Nuovo cliente"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="accent" onClick={handleSubmit} loading={saving}>Crea</Button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required autoFocus />
        <Input label="Telefono" type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
        <Input label="Email (opzionale)" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </form>
    </Modal>
  )
}
