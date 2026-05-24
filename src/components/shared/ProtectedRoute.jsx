import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Spinner from './Spinner'

export function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export function RequireCliente({ children }) {
  const { user, isAdmin, cliente, clienteStatus, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (clienteStatus === 'loading') return <div className="page-center"><Spinner /></div>
  if (clienteStatus === 'missing' || !cliente?.telefono) return <Navigate to="/completa-profilo" replace />
  return children
}

export function GuestOnly({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div className="page-center"><Spinner /></div>
  if (user) return <Navigate to={isAdmin ? '/admin' : '/'} replace />
  return children
}
