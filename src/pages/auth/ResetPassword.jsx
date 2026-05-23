import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'

export default function ResetPassword() {
  const { confirmPasswordRecovery } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const secret = params.get('secret')

  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!userId || !secret) {
    return (
      <AuthLayout title="Link non valido">
        <div className="alert alert--error">Il link di recupero non è valido o è scaduto.</div>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return }
    if (password !== conferma) { setError('Le password non coincidono.'); return }
    setError('')
    setLoading(true)
    try {
      await confirmPasswordRecovery(userId, secret, password)
      navigate('/login?reset=1')
    } catch {
      setError('Link scaduto o già usato. Richiedi un nuovo link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Nuova password">
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Nuova password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          hint="Almeno 8 caratteri"
          autoComplete="new-password"
        />
        <Input
          label="Conferma password"
          type="password"
          value={conferma}
          onChange={e => setConferma(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} fullWidth>Salva password</Button>
      </form>
    </AuthLayout>
  )
}
