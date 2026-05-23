import { useState } from 'react'
import { useServizi } from '../../hooks/useServizi'
import Button from '../../components/shared/Button'
import InfoTooltip from '../../components/shared/InfoTooltip'
import Modal from '../../components/shared/Modal'
import Input from '../../components/shared/Input'
import Toggle from '../../components/shared/Toggle'
import EmptyState from '../../components/shared/EmptyState'
import Spinner from '../../components/shared/Spinner'

const EMPTY_FORM = { nome: '', durata_minuti: 30 }

export default function Servizi() {
  const { servizi, loading, error, crea, aggiorna, toggleAttivo, spostaOrdine } = useServizi()
  const [modal, setModal] = useState(null) // null | { mode: 'crea' | 'modifica', servizio? }
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const apriCrea = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal({ mode: 'crea' })
  }

  const apriModifica = (s) => {
    setForm({ nome: s.nome, durata_minuti: s.durata_minuti })
    setFormError('')
    setModal({ mode: 'modifica', servizio: s })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setFormError('Il nome è obbligatorio.'); return }
    if (!form.durata_minuti || form.durata_minuti < 5) { setFormError('Durata minima 5 minuti.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'crea') {
        await crea({ nome: form.nome.trim(), durata_minuti: Number(form.durata_minuti) })
      } else {
        await aggiorna(modal.servizio.$id, { nome: form.nome.trim(), durata_minuti: Number(form.durata_minuti) })
      }
      setModal(null)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-center"><Spinner /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page__title">Servizi <InfoTooltip testo={"Gestisci i servizi che offri (es. Taglio, Colore, Piega).\n\n• Ogni servizio ha un nome e una durata in minuti — la durata determina quanti slot vengono occupati nella prenotazione.\n• Usa le frecce ↑ ↓ per cambiare l'ordine in cui appaiono ai clienti.\n• Disattiva un servizio per nasconderlo senza eliminarlo."} /></h1>
        <Button variant="accent" onClick={apriCrea}>+ Aggiungi</Button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {servizi.length === 0 ? (
        <EmptyState
          icon="✂️"
          title="Nessun servizio"
          description="Aggiungi i servizi che offri nel tuo salone."
          action={<Button variant="accent" onClick={apriCrea}>Aggiungi servizio</Button>}
        />
      ) : (
        <div className="list">
          {servizi.map((s, idx) => (
            <div key={s.$id} className={`list-item ${!s.attivo ? 'list-item--disabled' : ''}`}>
              <div className="list-item__reorder">
                <button
                  className="reorder-btn"
                  onClick={() => spostaOrdine(s.$id, -1)}
                  disabled={idx === 0}
                  aria-label="Sposta su"
                >▲</button>
                <button
                  className="reorder-btn"
                  onClick={() => spostaOrdine(s.$id, 1)}
                  disabled={idx === servizi.length - 1}
                  aria-label="Sposta giù"
                >▼</button>
              </div>
              <div className="list-item__content">
                <span className="list-item__title">{s.nome}</span>
                <span className="list-item__meta">{s.durata_minuti} min</span>
              </div>
              <div className="list-item__actions">
                <Toggle
                  checked={s.attivo}
                  onChange={(val) => toggleAttivo(s.$id, val)}
                  label={s.attivo ? 'Attivo' : 'Inattivo'}
                />
                <button className="icon-btn" onClick={() => apriModifica(s)} aria-label="Modifica">✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'crea' ? 'Nuovo servizio' : 'Modifica servizio'}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>Annulla</Button>
              <Button variant="accent" onClick={handleSubmit} loading={saving}>
                {modal.mode === 'crea' ? 'Crea' : 'Salva'}
              </Button>
            </>
          }
        >
          {formError && <div className="alert alert--error">{formError}</div>}
          <form onSubmit={handleSubmit} className="form-stack">
            <Input
              label="Nome servizio"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
              placeholder="Es. Taglio, Colore + Taglio…"
              autoFocus
            />
            <Input
              label="Durata (minuti)"
              type="number"
              min={5}
              max={480}
              step={5}
              value={form.durata_minuti}
              onChange={e => setForm(f => ({ ...f, durata_minuti: e.target.value }))}
              required
            />
          </form>
        </Modal>
      )}
    </div>
  )
}
