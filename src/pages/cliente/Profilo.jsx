import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import Input from '../../components/shared/Input'

export default function Profilo() {
  const { user, cliente, updateProfilo, logout } = useAuth()

  const [nome, setNome] = useState(cliente?.nome || user?.name || '')
  const [telefono, setTelefono] = useState(cliente?.telefono || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errore, setErrore] = useState('')

  const initials = nome ? nome.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrore('')
    setSuccess(false)
    try {
      await updateProfilo({ nome: nome.trim(), telefono: telefono.trim() })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="profilo-page">

      {/* Header avatar */}
      <div className="profilo-hero">
        <div className="profilo-avatar">{initials}</div>
        <h1 className="profilo-hero__name">{nome || 'Profilo'}</h1>
        <p className="profilo-hero__email">{user?.email}</p>
      </div>

      <div className="profilo-body">
        {errore && <div className="alert alert--error mb-3">{errore}</div>}
        {success && <div className="alert alert--success mb-3">Profilo aggiornato.</div>}

        <form onSubmit={handleSubmit}>
          <div className="profilo-section">
            <h2 className="profilo-section__title">Informazioni</h2>
            <div className="profilo-fields">
              <Input
                label="Nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                autoComplete="name"
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                hint="L'email non può essere modificata"
              />
              <Input
                label="Telefono"
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </form>

        <button className="profilo-logout" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
