export default function Spinner({ size = 'md', label = 'Caricamento…' }) {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <div className="spinner__circle" />
    </div>
  )
}
