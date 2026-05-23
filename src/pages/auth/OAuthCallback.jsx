import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'

export default function OAuthCallback() {
  const { handleOAuthCallback } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      // Retry fino a che la sessione Appwrite è attiva
      let lastError
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 800 * (i + 1)))
        try {
          const { admin } = await handleOAuthCallback()
          if (admin) navigate('/admin')
          else navigate('/completa-profilo')
          return
        } catch (e) {
          lastError = e
          if (!e.message.includes('missing scopes')) throw e
        }
      }
      throw lastError
    }
    run().catch(e => setError(e.message))
  }, [handleOAuthCallback, navigate])

  if (error) {
    return (
      <AuthLayout title="Errore">
        <div className="alert alert--error">{error}</div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Accesso in corso…">
      <p className="auth-subtitle">Attendere prego…</p>
    </AuthLayout>
  )
}
