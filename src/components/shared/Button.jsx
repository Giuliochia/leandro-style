import { useRef } from 'react'

export default function Button({
  children,
  loading = false,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}) {
  const btnRef = useRef(null)

  const handleClick = (e) => {
    if (disabled || loading) return
    const btn = btnRef.current
    if (!btn) return
    const circle = document.createElement('span')
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    circle.className = 'btn__ripple'
    circle.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`
    btn.appendChild(circle)
    circle.addEventListener('animationend', () => circle.remove())
    onClick?.(e)
  }

  return (
    <button
      ref={btnRef}
      className={`btn btn--${variant} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-label="Caricamento…" /> : children}
    </button>
  )
}
