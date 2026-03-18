import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CORRECT_PASSWORD = 'TE01sunguard'
const AUTH_KEY = 'sunsense_auth'

export default function PasswordGate() {
  const navigate = useNavigate()
  const [input, setInput]     = useState('')
  const [error, setError]     = useState(false)
  const [shake, setShake]     = useState(false)
  const [visible, setVisible] = useState(false)

  const handleSubmit = () => {
    if (input === CORRECT_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1')
      navigate('/home')
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (error) setError(false)
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100vh',
      overflow: 'hidden', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background video */}
      <video
        autoPlay muted loop playsInline
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0, pointerEvents: 'none',
        }}
      >
        <source src="/images/bac_0.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }} />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .shake { animation: shake 0.45s ease; }
      `}</style>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 'min(400px, 90vw)',
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: '28px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fcd34d, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', boxShadow: '0 4px 20px rgba(249,115,22,0.5)',
          }}>☀</div>
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '2px' }}>
            <span style={{ color: '#fff' }}>Sun</span>
            <span style={{ color: '#fcd34d' }}>Guard</span>
          </span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
            Access Required
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            Enter the password to continue
          </p>
        </div>

        {/* Input */}
        <div
          className={shake ? 'shake' : ''}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={visible ? 'text' : 'password'}
              value={input}
              onChange={e => { setInput(e.target.value); setError(false) }}
              onKeyDown={handleKeyDown}
              placeholder="Enter password"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '13px 44px 13px 16px',
                borderRadius: '14px',
                border: error
                  ? '1.5px solid #f87171'
                  : '1.5px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => {
                if (!error) e.target.style.borderColor = 'rgba(249,115,22,0.8)'
              }}
              onBlur={e => {
                if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.25)'
              }}
            />
            {/* Toggle visibility */}
            <button
              onClick={() => setVisible(v => !v)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '16px', padding: '4px',
                lineHeight: 1,
              }}
              tabIndex={-1}
            >
              {visible ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#f87171', margin: 0, paddingLeft: '4px' }}>
              Incorrect password. Please try again.
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '13px',
            borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #f97316, #c2410c)',
            color: '#fff', fontSize: '15px', fontWeight: 600,
            letterSpacing: '1px', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
            transition: 'opacity 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Enter →
        </button>

        {/* Back to landing */}
        <a
          href="/"
          style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.45)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
        >
          ← Back to home
        </a>
      </div>
    </div>
  )
}