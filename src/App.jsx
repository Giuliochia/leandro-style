import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAdmin, RequireCliente, GuestOnly } from './components/shared/ProtectedRoute'

// Auth pages
import Login from './pages/auth/Login'
import Registrazione from './pages/auth/Registrazione'
import RecuperoPassword from './pages/auth/RecuperoPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerificaEmail from './pages/auth/VerificaEmail'
import OAuthCallback from './pages/auth/OAuthCallback'
import CompletaProfilo from './pages/auth/CompletaProfilo'

// Layouts
import AdminLayout from './components/shared/AdminLayout'
import ClienteLayout from './components/shared/ClienteLayout'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import Servizi from './pages/admin/Servizi'
import Operatori from './pages/admin/Operatori'
import Clienti from './pages/admin/Clienti'
import Impostazioni from './pages/admin/Impostazioni'
import Agenda from './pages/admin/Agenda'

// Cliente pages
import ClienteDashboard from './pages/cliente/Dashboard'
import Prenota from './pages/cliente/Prenota'
import MieiAppuntamenti from './pages/cliente/Appuntamenti'
import Profilo from './pages/cliente/Profilo'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pubbliche */}
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/registrazione" element={<GuestOnly><Registrazione /></GuestOnly>} />
          <Route path="/recupero-password" element={<GuestOnly><RecuperoPassword /></GuestOnly>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verifica-email" element={<VerificaEmail />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/completa-profilo" element={<RequireCliente><CompletaProfilo /></RequireCliente>} />

          {/* Area admin */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="clienti" element={<Clienti />} />
            <Route path="servizi" element={<Servizi />} />
            <Route path="operatori" element={<Operatori />} />
            <Route path="impostazioni" element={<Impostazioni />} />
          </Route>

          {/* Area cliente */}
          <Route path="/" element={<RequireCliente><ClienteLayout /></RequireCliente>}>
            <Route index element={<ClienteDashboard />} />
            <Route path="prenota" element={<Prenota />} />
            <Route path="appuntamenti" element={<MieiAppuntamenti />} />
            <Route path="profilo" element={<Profilo />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
