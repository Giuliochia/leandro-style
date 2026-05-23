export default function AuthLayout({ title, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <img src="/logo.png" alt="Leandro's Style" className="auth-logo" />
        </div>
        <h1 className="auth-card__title">{title}</h1>
        {children}
      </div>
    </div>
  )
}
