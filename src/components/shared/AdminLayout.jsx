import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { usePushNotifications } from '../../hooks/usePushNotifications'

const IconHome = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" fill="currentColor"/>
      : <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    }
    <rect x="9" y="13" width="6" height="8" rx="1"
      fill={filled ? 'var(--color-bg-card)' : 'none'}
      stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.5"/>
  </svg>
)

const IconCalendar = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="17" rx="2"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    {filled && <rect x="3" y="5" width="18" height="6" rx="2" fill="currentColor"/>}
    <line x1="16" y1="3" x2="16" y2="7"
      stroke={filled ? 'var(--color-bg-card)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="3" x2="8" y2="7"
      stroke={filled ? 'var(--color-bg-card)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8"  cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="12" cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="16" cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="8"  cy="18" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="12" cy="18" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
  </svg>
)

const IconUsers = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="8" r="3.5"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      fill={filled ? 'currentColor' : 'none'}/>
    <circle cx="18" cy="8" r="2.5"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <path d="M22 20c0-2.5-1.8-4.5-4-5"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconScissors = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="6" cy="6" r="3"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="6" cy="18" r="3"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8.5" y1="8.5"  x2="20" y2="20"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8.5" y1="15.5" x2="14" y2="10"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16"  y1="8"    x2="20" y2="4"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconSettings = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const IconEye = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="3"
      fill={filled ? 'var(--color-bg-card)' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.5"/>
  </svg>
)

const navItems = [
  { to: '/admin',            label: 'Dashboard', Icon: IconHome,     end: true },
  { to: '/admin/agenda',     label: 'Agenda',    Icon: IconCalendar         },
  { to: '/admin/clienti',    label: 'Clienti',   Icon: IconUsers            },
  { to: '/admin/servizi',    label: 'Servizi',   Icon: IconScissors         },
  { to: '/admin/impostazioni', label: 'Impostaz.', Icon: IconSettings       },
]

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { permesso, chiediPermesso } = usePushNotifications('admin')

  useEffect(() => {
    if (permesso === 'default') chiediPermesso()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-layout app-layout--admin">
      <header className="topbar">
        <span className="topbar__brand">Leandro's Style</span>
        <button className="topbar__logout" onClick={handleLogout}>Esci</button>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <span className="bottom-nav__icon" aria-hidden="true">
                  <Icon filled={isActive} />
                </span>
                <span className="bottom-nav__label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
