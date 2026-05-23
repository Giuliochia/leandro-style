import { useState, useEffect } from 'react'
import InfoTooltip from '../../components/shared/InfoTooltip'
import { useOperatori } from '../../hooks/useOperatori'
import { useOrariLavoro, GIORNI } from '../../hooks/useOrariLavoro'
import { useBlocchi } from '../../hooks/useBlocchi'
import { logError } from '../../lib/logger'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { Query } from 'appwrite'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import Modal from '../../components/shared/Modal'
import Toggle from '../../components/shared/Toggle'
import Spinner from '../../components/shared/Spinner'
import EmptyState from '../../components/shared/EmptyState'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Impostazioni() {
  const { operatori, loading: loadingOp } = useOperatori()
  const [operatoreId, setOperatoreId] = useState(null)

  const selectedOp = operatori.find(o => o.$id === operatoreId) || operatori[0]

  if (loadingOp) return <div className="page-center"><Spinner /></div>
  if (operatori.length === 0) return (
    <div className="page">
      <h1 className="page__title">Impostazioni</h1>
      <div className="alert alert--warning">Nessun operatore trovato. Aggiungine uno prima.</div>
    </div>
  )

  const opAttivo = selectedOp || operatori[0]

  return (
    <div className="page">
      <h1 className="page__title">Impostazioni</h1>

      {operatori.length > 1 && (
        <div className="tab-bar">
          {operatori.map(o => (
            <button
              key={o.$id}
              className={`tab-bar__item ${(operatoreId || operatori[0].$id) === o.$id ? 'tab-bar__item--active' : ''}`}
              onClick={() => setOperatoreId(o.$id)}
            >
              {o.nome}
            </button>
          ))}
        </div>
      )}

      <GiorniChiusura />
      <EccezioniApertura />
      <OrariLavoro operatoreId={opAttivo.$id} operatoreNome={opAttivo.nome} />
      <Blocchi operatoreId={opAttivo.$id} />
    </div>
  )
}

// ── Giorni di chiusura ricorrenti ────────────────────────────────────────────

function GiorniChiusura() {
  const { blocchiRicorrenti, loading, creaRicorrente, eliminaRicorrente } = useBlocchi()
  const GIORNI_LABEL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

  const giorniChiusi = new Set(blocchiRicorrenti.map(b => b.giorno_settimana))

  const toggleGiorno = async (idx) => {
    if (giorniChiusi.has(idx)) {
      const blocco = blocchiRicorrenti.find(b => b.giorno_settimana === idx)
      if (blocco) await eliminaRicorrente(blocco.$id)
    } else {
      await creaRicorrente(idx, 'Chiuso')
    }
  }

  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Giorni di chiusura <InfoTooltip testo={"Seleziona i giorni in cui il salone è sempre chiuso (es. domenica e lunedì).\n\nI clienti non potranno prenotare in questi giorni. Tocca un giorno per attivarlo o disattivarlo — rosso significa chiuso."} /></h2>
      </div>
      <p className="text-muted">Seleziona i giorni in cui il salone è sempre chiuso.</p>
      {loading ? <Spinner /> : (
        <div className="giorni-chiusura-grid">
          {GIORNI_LABEL.map((nome, idx) => (
            <button
              key={idx}
              className={`giorno-chip ${giorniChiusi.has(idx) ? 'giorno-chip--chiuso' : ''}`}
              onClick={() => toggleGiorno(idx)}
            >
              {nome}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Eccezioni apertura (aperto in giorni festivi/chiusi) ─────────────────────

function EccezioniApertura() {
  const { eccezioniApertura, loading, creaEccezioneApertura, eliminaEccezioneApertura, creaOrarioSpeciale, eliminaOrarioSpeciale } = useBlocchi()
  const { operatori } = useOperatori()
  const [nuovaData, setNuovaData] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('13:00')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  // orari speciali già salvati, caricati on demand
  const [orariSpeciali, setOrariSpeciali] = useState([])

  useEffect(() => {
    if (!operatori.length) return
    databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
      Query.equal('operatore_id', operatori[0].$id),
      Query.equal('attivo', true),
      Query.limit(50),
    ]).then(res => {
      setOrariSpeciali(res.documents.filter(o => o.data_specifica))
    }).catch(e => logError('Impostazioni/loadOrariSpeciali', e))
  }, [operatori])

  const aggiungi = async () => {
    if (!nuovaData) return
    if (oraInizio >= oraFine) { setFormError("L'ora di fine deve essere dopo l'ora di inizio."); return }
    setSaving(true)
    setFormError('')
    try {
      await creaEccezioneApertura(nuovaData)
      if (operatori.length) {
        const doc = await creaOrarioSpeciale(operatori[0].$id, nuovaData, oraInizio, oraFine)
        setOrariSpeciali(prev => [...prev, doc])
      }
      setNuovaData('')
      setOraInizio('09:00')
      setOraFine('13:00')
    } finally {
      setSaving(false)
    }
  }

  const rimuovi = async (b) => {
    await eliminaEccezioneApertura(b.$id)
    // rimuovi anche l'orario speciale corrispondente
    const dataStr = b.data_ora_inizio.slice(0, 10)
    const orariDaRimuovere = orariSpeciali.filter(o => o.data_specifica === dataStr)
    await Promise.all(orariDaRimuovere.map(o => eliminaOrarioSpeciale(o.$id)))
    setOrariSpeciali(prev => prev.filter(o => o.data_specifica !== dataStr))
  }

  const orariPerData = (dataStr) => orariSpeciali.filter(o => o.data_specifica === dataStr)

  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Aperture straordinarie <InfoTooltip testo={"Usa questa sezione se vuoi aprire in un giorno normalmente chiuso (festività, domenica, ecc.).\n\nScegli la data e l'orario in cui sarai disponibile. I clienti vedranno quegli slot e potranno prenotare normalmente."} /></h2>
      </div>
      <p className="text-muted">Aggiungi date in cui il salone apre nonostante sia festività o giorno di chiusura, specificando l'orario.</p>
      <div className="eccezione-form" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <Input type="date" value={nuovaData} onChange={e => setNuovaData(e.target.value)} label="Data" />
        <Input type="time" step={1800} value={oraInizio} onChange={e => setOraInizio(e.target.value)} label="Dalle" />
        <Input type="time" step={1800} value={oraFine} onChange={e => setOraFine(e.target.value)} label="Alle" />
        <Button onClick={aggiungi} disabled={!nuovaData || saving} size="sm">
          {saving ? <Spinner size="xs" /> : 'Aggiungi'}
        </Button>
      </div>
      {formError && <div className="alert alert--error" style={{ marginTop: '0.5rem' }}>{formError}</div>}
      {loading ? <Spinner /> : eccezioniApertura.length === 0 ? (
        <p className="text-muted" style={{ marginTop: '0.75rem' }}>Nessuna apertura straordinaria.</p>
      ) : (
        <ul className="blocchi-list" style={{ marginTop: '0.75rem' }}>
          {eccezioniApertura.map(b => {
            const dataStr = b.data_ora_inizio.slice(0, 10)
            const orari = orariPerData(dataStr)
            return (
              <li key={b.$id} className="blocchi-list__item">
                <span>
                  <strong>{format(parseISO(b.data_ora_inizio), 'EEEE d MMMM yyyy', { locale: it })}</strong>
                  {orari.length > 0 && (
                    <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
                      {orari.map(o => `${o.ora_inizio}–${o.ora_fine}`).join(', ')}
                    </span>
                  )}
                </span>
                <button className="icon-btn icon-btn--danger" onClick={() => rimuovi(b)} title="Rimuovi">✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ── Orari di lavoro ──────────────────────────────────────────────────────────

function OrariLavoro({ operatoreId, operatoreNome }) {
  const { orari, loading, error, crea, aggiorna, elimina } = useOrariLavoro(operatoreId)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ giorno_settimana: 1, ora_inizio: '09:00', ora_fine: '18:00' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const apriCrea = () => {
    setForm({ giorno_settimana: 1, ora_inizio: '09:00', ora_fine: '18:00' })
    setFormError('')
    setModal({ mode: 'crea' })
  }

  const apriModifica = (o) => {
    setForm({ giorno_settimana: o.giorno_settimana, ora_inizio: o.ora_inizio, ora_fine: o.ora_fine })
    setFormError('')
    setModal({ mode: 'modifica', orario: o })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.ora_inizio >= form.ora_fine) { setFormError('L\'ora di fine deve essere dopo l\'ora di inizio.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'crea') {
        await crea({
          giorno_settimana: Number(form.giorno_settimana),
          ora_inizio: form.ora_inizio,
          ora_fine: form.ora_fine,
        })
      } else {
        await aggiorna(modal.orario.$id, {
          giorno_settimana: Number(form.giorno_settimana),
          ora_inizio: form.ora_inizio,
          ora_fine: form.ora_fine,
        })
      }
      setModal(null)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Raggruppa per giorno
  const perGiorno = GIORNI.map((nome, idx) => ({
    nome,
    idx,
    fasce: orari.filter(o => o.giorno_settimana === idx && o.attivo),
  })).filter(g => g.fasce.length > 0)

  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Orari di lavoro — {operatoreNome} <InfoTooltip testo={"Definisci in quali giorni e orari sei disponibile ogni settimana.\n\nPuoi aggiungere più fasce nello stesso giorno per gestire la pausa pranzo (es. 09:00–13:00 e 15:00–19:00). I clienti vedranno solo gli slot liberi all'interno di queste fasce."} /></h2>
        <Button variant="accent" onClick={apriCrea}>+ Aggiungi fascia</Button>
      </div>
      <p className="text-muted">Aggiungi più fasce nello stesso giorno per gestire le pause (es. 09:00–13:00 e 15:00–19:00).</p>

      {error && <div className="alert alert--error">{error}</div>}
      {loading && <Spinner />}

      {!loading && orari.length === 0 && (
        <EmptyState icon="🕐" title="Nessun orario" description="Aggiungi le fasce orarie di lavoro." />
      )}

      {perGiorno.map(g => (
        <div key={g.idx} className="orario-giorno">
          <span className="orario-giorno__nome">{g.nome}</span>
          <div className="orario-giorno__fasce">
            {g.fasce.map(f => (
              <div key={f.$id} className="orario-fascia">
                <span>{f.ora_inizio} – {f.ora_fine}</span>
                <div className="row-actions">
                  <Toggle
                    checked={f.attivo}
                    onChange={val => aggiorna(f.$id, { attivo: val })}
                  />
                  <button className="icon-btn" onClick={() => apriModifica(f)}>✏️</button>
                  <button className="icon-btn icon-btn--danger" onClick={() => elimina(f.$id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Mostra anche le fasce disattivate */}
      {orari.filter(o => !o.attivo).map(f => (
        <div key={f.$id} className="orario-fascia orario-fascia--disabled">
          <span>{GIORNI[f.giorno_settimana]} {f.ora_inizio}–{f.ora_fine} <em>(disattivata)</em></span>
          <div className="row-actions">
            <Toggle checked={false} onChange={val => aggiorna(f.$id, { attivo: val })} />
            <button className="icon-btn icon-btn--danger" onClick={() => elimina(f.$id)}>🗑️</button>
          </div>
        </div>
      ))}

      {modal && (
        <Modal
          title={modal.mode === 'crea' ? 'Nuova fascia oraria' : 'Modifica fascia'}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>Annulla</Button>
              <Button variant="accent" onClick={handleSubmit} loading={saving}>
                {modal.mode === 'crea' ? 'Aggiungi' : 'Salva'}
              </Button>
            </>
          }
        >
          {formError && <div className="alert alert--error">{formError}</div>}
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="input-group">
              <label className="input-group__label">Giorno</label>
              <select
                className="input-group__field"
                value={form.giorno_settimana}
                onChange={e => setForm(f => ({ ...f, giorno_settimana: e.target.value }))}
              >
                {GIORNI.map((g, i) => <option key={i} value={i}>{g}</option>)}
              </select>
            </div>
            <Input
              label="Ora inizio"
              type="time"
              value={form.ora_inizio}
              onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))}
              required
            />
            <Input
              label="Ora fine"
              type="time"
              value={form.ora_fine}
              onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))}
              required
            />
          </form>
        </Modal>
      )}
    </section>
  )
}

// ── Blocchi ──────────────────────────────────────────────────────────────────

function Blocchi({ operatoreId }) {
  const { blocchi, loading, error, crea, elimina } = useBlocchi()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ data_inizio: '', ora_inizio: '00:00', data_fine: '', ora_fine: '23:59', motivo: '', tutto_salone: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const apriModal = () => {
    const oggi = format(new Date(), 'yyyy-MM-dd')
    setForm({ data_inizio: oggi, ora_inizio: '00:00', data_fine: oggi, ora_fine: '23:59', motivo: '', tutto_salone: true })
    setFormError('')
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.data_inizio || !form.data_fine) { setFormError('Inserisci date di inizio e fine.'); return }
    const inizio = new Date(`${form.data_inizio}T${form.ora_inizio}:00`)
    const fine = new Date(`${form.data_fine}T${form.ora_fine}:00`)
    if (fine <= inizio) { setFormError('La fine deve essere dopo l\'inizio.'); return }
    setSaving(true)
    setFormError('')
    try {
      await crea({
        operatore_id: form.tutto_salone ? null : operatoreId,
        data_ora_inizio: inizio.toISOString(),
        data_ora_fine: fine.toISOString(),
        motivo: form.motivo.trim(),
      })
      setModal(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()
  const futuri = blocchi.filter(b => new Date(b.data_ora_fine) >= now)
  const passati = blocchi.filter(b => new Date(b.data_ora_fine) < now)

  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Blocchi e chiusure <InfoTooltip testo={"Blocca singole giornate o periodi specifici (ferie, malattia, chiusura straordinaria).\n\nA differenza dei giorni di chiusura ricorrenti, questi blocchi valgono solo per le date che indichi. Puoi bloccare un intero giorno o solo una fascia oraria."} /></h2>
        <Button variant="accent" onClick={apriModal}>+ Aggiungi blocco</Button>
      </div>
      <p className="text-muted">Ferie, chiusure programmate, assenze. Le fasce bloccate non sono prenotabili.</p>

      {error && <div className="alert alert--error">{error}</div>}
      {loading && <Spinner />}

      {!loading && futuri.length === 0 && (
        <EmptyState icon="🏖️" title="Nessun blocco programmato" />
      )}

      {futuri.length > 0 && (
        <div className="list mt-3">
          {futuri.map(b => (
            <div key={b.$id} className="list-item">
              <div className="list-item__content">
                <span className="list-item__title">{b.motivo || 'Blocco'}</span>
                <span className="list-item__meta">
                  {format(parseISO(b.data_ora_inizio), 'dd MMM yyyy HH:mm', { locale: it })}
                  {' → '}
                  {format(parseISO(b.data_ora_fine), 'dd MMM yyyy HH:mm', { locale: it })}
                </span>
                {!b.operatore_id && <span className="badge badge--orange ml-2">Tutto il salone</span>}
              </div>
              <button className="icon-btn icon-btn--danger" onClick={() => elimina(b.$id)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {passati.length > 0 && (
        <details className="mt-3">
          <summary className="text-muted" style={{ cursor: 'pointer' }}>Blocchi passati ({passati.length})</summary>
          <div className="list mt-2">
            {passati.slice(0, 10).map(b => (
              <div key={b.$id} className="list-item list-item--disabled">
                <div className="list-item__content">
                  <span className="list-item__title">{b.motivo || 'Blocco'}</span>
                  <span className="list-item__meta">
                    {format(parseISO(b.data_ora_inizio), 'dd MMM yyyy', { locale: it })}
                    {' → '}
                    {format(parseISO(b.data_ora_fine), 'dd MMM yyyy', { locale: it })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {modal && (
        <Modal
          title="Nuovo blocco"
          onClose={() => setModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(false)}>Annulla</Button>
              <Button variant="accent" onClick={handleSubmit} loading={saving}>Aggiungi</Button>
            </>
          }
        >
          {formError && <div className="alert alert--error">{formError}</div>}
          <form onSubmit={handleSubmit} className="form-stack">
            <Toggle
              checked={form.tutto_salone}
              onChange={val => setForm(f => ({ ...f, tutto_salone: val }))}
              label="Blocca tutto il salone"
            />
            <div className="row-2col">
              <Input label="Data inizio" type="date" value={form.data_inizio} onChange={e => setForm(f => ({ ...f, data_inizio: e.target.value }))} required />
              <Input label="Ora inizio" type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))} required />
            </div>
            <div className="row-2col">
              <Input label="Data fine" type="date" value={form.data_fine} onChange={e => setForm(f => ({ ...f, data_fine: e.target.value }))} required />
              <Input label="Ora fine" type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))} required />
            </div>
            <Input label="Motivo (opzionale)" value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Es. Ferie agosto, Chiusura straordinaria…" />
          </form>
        </Modal>
      )}
    </section>
  )
}
