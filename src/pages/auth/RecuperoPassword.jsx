import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'

export default function RecuperoPassword() {
  const { sendPasswordRecovery } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordRecovery(email.trim())
      setSent(true)
    } catch {
      setError('Impossibile inviare l\'email. Controlla l\'indirizzo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Email inviata">
        <div className="alert alert--success">
          Ti abbiamo inviato un link per reimpostare la password. Controlla la tua casella email.
        </div>
        <p className="auth-form__switch"><Link to="/login">Torna al login</Link></p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recupera password">
      <p className="auth-subtitle">Inserisci la tua email e ti invieremo un link per reimpostare la password.</p>
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <Button type="submit" loading={loading} fullWidth>Invia link</Button>
      </form>
      <p className="auth-form__switch"><Link to="/login">Torna al login</Link></p>
    </AuthLayout>
  )
}
