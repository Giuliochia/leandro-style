import { NavLink, Outlet } from 'react-router-dom'

const IconHome = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {filled
      ? <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" fill="currentColor"/>
      : <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    }
    <rect x="9" y="13" width="6" height="8" rx="1" fill={filled ? 'var(--color-bg-card)' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.5"/>
  </svg>
)

const IconScissors = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="3" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="6" cy="18" r="3" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8.5" y1="8.5" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8.5" y1="15.5" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="8" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconCalendar = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="17" rx="2" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    {filled && <rect x="3" y="5" width="18" height="6" rx="2" fill="currentColor"/>}
    <line x1="16" y1="3" x2="16" y2="7" stroke={filled ? 'var(--color-bg-card)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="3" x2="8" y2="7" stroke={filled ? 'var(--color-bg-card)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="12" cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="16" cy="14" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="8" cy="18" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
    <circle cx="12" cy="18" r="1" fill={filled ? 'var(--color-bg-card)' : 'currentColor'}/>
  </svg>
)

const IconUser = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill={filled ? 'currentColor' : 'none'}/>
  </svg>
)

const navItems = [
  { to: '/', label: 'Home', Icon: IconHome, end: true },
  { to: '/prenota', label: 'Prenota', Icon: IconScissors },
  { to: '/appuntamenti', label: 'Agenda', Icon: IconCalendar },
  { to: '/profilo', label: 'Profilo', Icon: IconUser },
]

export default function ClienteLayout() {
  return (
    <div className="app-layout app-layout--cliente">
      <header className="topbar">
        <span className="topbar__brand">Leandro's Style</span>
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
