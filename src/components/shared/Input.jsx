export default function Input({ label, hint, error, className = '', ...props }) {
  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
      {label && <label className="input-group__label">{label}</label>}
      <input className="input-group__field" {...props} />
      {hint && !error && <span className="input-group__hint">{hint}</span>}
      {error && <span className="input-group__error">{error}</span>}
    </div>
  )
}
