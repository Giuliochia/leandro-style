import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'

export default function VerificaEmail() {
  const { confirmEmailVerification } = useAuth()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const secret = params.get('secret')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!userId || !secret) { setStatus('error'); return }
    confirmEmailVerification(userId, secret)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [userId, secret, confirmEmailVerification])

  return (
    <AuthLayout title="Verifica email">
      {status === 'loading' && <p className="auth-subtitle">Verifica in corso…</p>}
      {status === 'success' && (
        <>
          <div className="alert alert--success">Email verificata con successo!</div>
          <p className="auth-form__switch"><Link to="/">Vai alla tua area</Link></p>
        </>
      )}
      {status === 'error' && (
        <div className="alert alert--error">Link non valido o già usato.</div>
      )}
    </AuthLayout>
  )
}
