import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'

export default function CompletaProfilo() {
  const { cliente, updateProfilo } = useAuth()
  const navigate = useNavigate()
  const [telefono, setTelefono] = useState(cliente?.telefono || '')
  const [nome, setNome] = useState(cliente?.nome || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!telefono.trim()) { setError('Il numero di telefono è obbligatorio.'); return }
    setError('')
    setLoading(true)
    try {
      await updateProfilo({ nome: nome.trim(), telefono: telefono.trim() })
      // Forza reload completo per assicurarsi che lo state sia aggiornato
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Completa il tuo profilo">
      <p className="auth-subtitle">Inserisci il tuo numero di telefono per completare la registrazione.</p>
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          autoComplete="name"
        />
        <Input
          label="Telefono"
          type="tel"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
          required
          autoComplete="tel"
          hint="Ci servirà per contattarti se necessario"
        />
        <Button type="submit" loading={loading} fullWidth>Salva e continua</Button>
      </form>
    </AuthLayout>
  )
}
