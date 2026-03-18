import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/home',   label: 'Home'      },
  { to: '/cities', label: 'Cities'    },
  { to: '/detail', label: 'UV Detail' },
]

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px',
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid #ffedd5',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 8px rgba(249,115,22,0.08)',
    }}>

      {/* Logo */}
      <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #fcd34d, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', boxShadow: '0 4px 10px rgba(249,115,22,0.3)',
        }}>☀</div>
        <span style={{ fontSize: '17px', fontWeight: 700 }}>
          <span style={{ color: '#1c1917' }}>Sun</span>
          <span style={{ color: '#f97316' }}>Guard</span>
        </span>
      </Link>

      {/* Text navigation — visible on all screen sizes */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {NAV_ITEMS.map(({ to, label }) => {
          const isActive = pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                textDecoration: 'none',
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f97316' : '#78716c',
                background: isActive ? '#fff7ed' : 'transparent',
                borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#f97316'
                  e.currentTarget.style.background = '#fff7ed'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#78716c'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <style>{`
        @media (max-width: 480px) {
          header { padding: 0 16px !important; }
          nav a  { padding: 6px 10px !important; font-size: 13px !important; }
        }
      `}</style>
    </header>
  )
}