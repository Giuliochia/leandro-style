import { useNavigate, useLocation } from 'react-router-dom'

// Ritorna una funzione navigate che aggiunge /admin/preview come prefisso
// quando siamo nella sezione preview admin
export function useClienteNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isPreview = location.pathname.startsWith('/admin/preview')
  const base = isPreview ? '/admin/preview' : ''

  return (path) => navigate(base + path)
}
