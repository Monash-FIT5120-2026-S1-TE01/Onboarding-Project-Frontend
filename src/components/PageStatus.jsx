export function PageSpinner({ label = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#f9fafb'
    }}>
      <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '3px solid #f3f4f6', borderTop: '3px solid #f97316',
          animation: 'sg-spin 0.8s linear infinite',
          margin: '0 auto 14px',
        }} />
        <p style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.04em' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

export function PageError({ message }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: '#fef2f2', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '22px',
        }}>!</div>
        <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.6 }}>
          {message ?? 'Something went wrong. Please try again.'}
        </p>
      </div>
    </div>
  )
}