import { useState } from 'react'
import { useOperatori } from '../../hooks/useOperatori'
import Button from '../../components/shared/Button'
import InfoTooltip from '../../components/shared/InfoTooltip'
import Modal from '../../components/shared/Modal'
import Input from '../../components/shared/Input'
import Toggle from '../../components/shared/Toggle'
import EmptyState from '../../components/shared/EmptyState'
import Spinner from '../../components/shared/Spinner'

export default function Operatori() {
  const { operatori, loading, error, crea, aggiorna, toggleAttivo } = useOperatori()
  const [modal, setModal] = useState(null)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const apriCrea = () => { setNome(''); setFormError(''); setModal({ mode: 'crea' }) }
  const apriModifica = (o) => { setNome(o.nome); setFormError(''); setModal({ mode: 'modifica', operatore: o }) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim()) { setFormError('Il nome è obbligatorio.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'crea') {
        await crea({ nome: nome.trim() })
      } else {
        await aggiorna(modal.operatore.$id, { nome: nome.trim() })
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
        <h1 className="page__title">Operatori <InfoTooltip testo={"Gli operatori sono le persone che lavorano nel salone (es. Leandro).\n\nOgni operatore ha i propri orari di lavoro e i propri appuntamenti. Se sei solo tu, ce n'è uno solo. Disattiva un operatore per nasconderlo senza eliminarlo."} /></h1>
        <Button variant="accent" onClick={apriCrea}>+ Aggiungi</Button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {operatori.length === 0 ? (
        <EmptyState
          icon="💈"
          title="Nessun operatore"
          description="Aggiungi almeno un operatore per iniziare."
          action={<Button variant="accent" onClick={apriCrea}>Aggiungi operatore</Button>}
        />
      ) : (
        <div className="list">
          {operatori.map(o => (
            <div key={o.$id} className={`list-item ${!o.attivo ? 'list-item--disabled' : ''}`}>
              <div className="list-item__content">
                <span className="list-item__title">{o.nome}</span>
              </div>
              <div className="list-item__actions">
                <Toggle
                  checked={o.attivo}
                  onChange={(val) => toggleAttivo(o.$id, val)}
                  label={o.attivo ? 'Attivo' : 'Inattivo'}
                />
                <button className="icon-btn" onClick={() => apriModifica(o)} aria-label="Modifica">✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'crea' ? 'Nuovo operatore' : 'Modifica operatore'}
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
              label="Nome operatore"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              placeholder="Es. Leandro"
              autoFocus
            />
          </form>
        </Modal>
      )}
    </div>
  )
}
