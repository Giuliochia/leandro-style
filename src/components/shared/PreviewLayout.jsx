import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/admin/preview', label: 'Home', icon: '🏠', end: true },
  { to: '/admin/preview/prenota', label: 'Prenota', icon: '➕' },
  { to: '/admin/preview/appuntamenti', label: 'Appuntamenti', icon: '📅' },
]

export default function PreviewLayout() {
  const navigate = useNavigate()

  return (
    <div className="app-layout app-layout--cliente">
      <header className="topbar">
        <button className="topbar__back" onClick={() => navigate('/admin/agenda')}>← Admin</button>
        <span className="topbar__brand" style={{ fontSize: '.8rem', opacity: .6 }}>Vista cliente</span>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
