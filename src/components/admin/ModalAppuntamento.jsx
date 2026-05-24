import { useState, useEffect } from 'react'
import { useServizi } from '../../hooks/useServizi'
import { useClienti } from '../../hooks/useClienti'
import { creaAppuntamento, aggiornaAppuntamento } from '../../hooks/useAppuntamenti'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { ID, Query } from 'appwrite'
import Modal from '../shared/Modal'
import { logError } from '../../lib/logger'
import Button from '../shared/Button'
import Input from '../shared/Input'
import { format, parseISO } from 'date-fns'
import { TZ } from '../../utils/appuntamenti'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export default function ModalAppuntamento({ appuntamento, serviziAppuntamento, operatoreId, dataIniziale, onClose, onSaved }) {
  const { servizi } = useServizi()
  const [cercaCliente, setCercaCliente] = useState('')
  const { clienti } = useClienti({ cerca: cercaCliente })

  const isModifica = !!appuntamento

  const [form, setForm] = useState(() => {
    if (isModifica) {
      const d = toZonedTime(new Date(appuntamento.data_ora_inizio), TZ)
      return {
        data: format(d, 'yyyy-MM-dd'),
        ora: format(d, 'HH:mm'),
        note: appuntamento.note || '',
        promemoria: appuntamento.promemoria_offset_minuti || 60,
      }
    }
    return {
      data: dataIniziale ? format(dataIniziale, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      ora: dataIniziale ? format(dataIniziale, 'HH:mm') : '10:00',
      note: '',
      promemoria: 60,
    }
  })

  const [serviziSelezionati, setServiziSelezionati] = useState(
    isModifica ? serviziAppuntamento.map(s => s.servizio_id) : []
  )
  const [clienteId, setClienteId] = useState(isModifica ? appuntamento.cliente_id : null)
  const [clienteNome, setClienteNome] = useState('')
  const [showClienti, setShowClienti] = useState(false)
  const [nuovoCliente, setNuovoCliente] = useState({ attivo: false, nome: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Carica nome cliente per modifica
  useEffect(() => {
    if (isModifica && appuntamento.cliente_id) {
      databases.getDocument(DB_ID, COLLECTIONS.CLIENTI, appuntamento.cliente_id)
        .then(c => setClienteNome(c.nome))
        .catch(e => logError('ModalAppuntamento/loadClienteNome', e, { clienteId: appuntamento.cliente_id }))
    }
  }, [isModifica, appuntamento])

  const durataTotale = serviziSelezionati.reduce((sum, sid) => {
    const s = servizi.find(s => s.$id === sid)
    return sum + (s?.durata_minuti || 0)
  }, 0)

  const toggleServizio = (sid) => {
    setServiziSelezionati(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    )
  }

  const selezionaCliente = (c) => {
    setClienteId(c.$id)
    setClienteNome(c.nome)
    setShowClienti(false)
    setCercaCliente('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clienteId && !nuovoCliente.attivo) { setError('Seleziona o crea un cliente.'); return }
    if (nuovoCliente.attivo && !nuovoCliente.nome.trim()) { setError('Inserisci il nome del nuovo cliente.'); return }
    if (nuovoCliente.attivo && !nuovoCliente.telefono.trim()) { setError('Inserisci il telefono del nuovo cliente.'); return }
    if (serviziSelezionati.length === 0) { setError('Seleziona almeno un servizio.'); return }
    if (!form.data || !form.ora) { setError('Inserisci data e ora.'); return }

    setSaving(true)
    setError('')
    try {
      let cId = clienteId
      let nomeFinale = nuovoCliente.attivo ? nuovoCliente.nome.trim() : clienteNome
      if (nuovoCliente.attivo) {
        const nc = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTI, ID.unique(), {
          nome: nuovoCliente.nome.trim(),
          telefono: nuovoCliente.telefono.trim(),
          created_at: new Date().toISOString(),
        })
        cId = nc.$id
      }

      const serviziNomi = serviziSelezionati
        .map(sid => servizi.find(s => s.$id === sid)?.nome)
        .filter(Boolean)

      // Interpreta data+ora nel fuso Europe/Rome e converte in UTC
      const dataOraUTC = fromZonedTime(`${form.data}T${form.ora}:00`, TZ).toISOString()

      if (isModifica) {
        await aggiornaAppuntamento(appuntamento.$id, {
          cliente_id: cId,
          data_ora_inizio: dataOraUTC,
          durata_minuti: durataTotale,
          note: form.note,
          promemoria_offset_minuti: Number(form.promemoria),
          cliente_nome: nomeFinale,
          servizi_nomi: serviziNomi.join(', '),
        }, serviziSelezionati)
      } else {
        await creaAppuntamento({
          clienteId: cId,
          operatoreId,
          dataOraInizio: dataOraUTC,
          durataMinuti: durataTotale,
          serviziIds: serviziSelezionati,
          note: form.note,
          promemoria: Number(form.promemoria),
          createdBy: 'admin',
          clienteNome: nomeFinale,
          serviziNomi,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isModifica ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="accent" onClick={handleSubmit} loading={saving}>
            {isModifica ? 'Salva' : 'Crea'}
          </Button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">

        {/* Cliente */}
        <div className="input-group">
          <label className="input-group__label">Cliente</label>
          {!nuovoCliente.attivo ? (
            <>
              {clienteId ? (
                <div className="cliente-selezionato">
                  <span>{clienteNome}</span>
                  <button type="button" className="icon-btn" onClick={() => { setClienteId(null); setClienteNome('') }}>✕</button>
                </div>
              ) : (
                <>
                  <input
                    className="input-group__field"
                    placeholder="Cerca per nome…"
                    value={cercaCliente}
                    onChange={e => { setCercaCliente(e.target.value); setShowClienti(true) }}
                    onFocus={() => setShowClienti(true)}
                  />
                  {showClienti && clienti.length > 0 && (
                    <div className="dropdown">
                      {clienti.slice(0, 8).map(c => (
                        <button key={c.$id} type="button" className="dropdown__item" onClick={() => selezionaCliente(c)}>
                          <span>{c.nome}</span>
                          <span className="text-muted">{c.telefono}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--sm mt-2"
                onClick={() => setNuovoCliente(n => ({ ...n, attivo: true }))}
              >
                + Nuovo cliente da telefono
              </button>
            </>
          ) : (
            <div className="form-stack">
              <Input
                label="Nome"
                value={nuovoCliente.nome}
                onChange={e => setNuovoCliente(n => ({ ...n, nome: e.target.value }))}
                required
                autoFocus
              />
              <Input
                label="Telefono"
                type="tel"
                value={nuovoCliente.telefono}
                onChange={e => setNuovoCliente(n => ({ ...n, telefono: e.target.value }))}
                required
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setNuovoCliente({ attivo: false, nome: '', telefono: '' })}
              >
                ← Cerca cliente esistente
              </button>
            </div>
          )}
        </div>

        {/* Data e ora */}
        <div className="row-2col">
          <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
          <div className="input-group">
            <label className="input-group__label">Ora</label>
            <select
              className="input-group__field"
              value={form.ora}
              onChange={e => setForm(f => ({ ...f, ora: e.target.value }))}
              required
            >
              {Array.from({ length: 48 }, (_, i) => {
                const h = String(Math.floor(i / 2)).padStart(2, '0')
                const m = i % 2 === 0 ? '00' : '30'
                return `${h}:${m}`
              }).map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Servizi */}
        <div className="input-group">
          <label className="input-group__label">
            Servizi {durataTotale > 0 && <span className="badge badge--blue ml-2">{durataTotale} min totali</span>}
          </label>
          <div className="servizi-grid">
            {servizi.filter(s => s.attivo).map(s => (
              <button
                key={s.$id}
                type="button"
                className={`servizio-chip ${serviziSelezionati.includes(s.$id) ? 'servizio-chip--selected' : ''}`}
                onClick={() => toggleServizio(s.$id)}
              >
                <span>{s.nome}</span>
                <span className="servizio-chip__durata">{s.durata_minuti}m</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="input-group">
          <label className="input-group__label">Note (opzionale)</label>
          <textarea
            className="input-group__field"
            rows={2}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Richieste particolari…"
          />
        </div>

        {/* Promemoria */}
        <div className="input-group">
          <label className="input-group__label">Promemoria cliente</label>
          <select
            className="input-group__field"
            value={form.promemoria}
            onChange={e => setForm(f => ({ ...f, promemoria: e.target.value }))}
          >
            <option value={60}>1 ora prima</option>
            <option value={120}>2 ore prima</option>
            <option value={180}>3 ore prima</option>
            <option value={1440}>1 giorno prima</option>
          </select>
        </div>
      </form>
    </Modal>
  )
}
