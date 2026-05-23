import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AuthLayout from '../../components/shared/AuthLayout'
import Input from '../../components/shared/Input'
import Button from '../../components/shared/Button'

export default function Registrazione() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (password.length < 8) return 'La password deve avere almeno 8 caratteri.'
    if (password !== conferma) return 'Le password non coincidono.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await register(nome.trim(), email.trim(), password)
      navigate('/completa-profilo')
    } catch (err) {
      if (err.message.includes('already exists') || err.code === 409) {
        setError('Email già registrata. Prova ad accedere.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Crea il tuo account">
      {error && <div className="alert alert--error">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} required autoComplete="name" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        <Input
          label="Password"
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
        <Button type="submit" loading={loading} fullWidth>Registrati</Button>
      </form>

      <div className="auth-divider"><span>oppure</span></div>

      <Button variant="outline" fullWidth onClick={loginWithGoogle} type="button">
        <GoogleIcon /> Continua con Google
      </Button>

      <p className="auth-form__switch">
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </AuthLayout>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
