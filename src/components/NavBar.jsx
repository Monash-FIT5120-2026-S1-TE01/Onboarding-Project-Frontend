import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/home',   label: 'Home'     },
  { to: '/cities', label: 'Cities'   },
  { to: '/detail', label: 'UV Detail'},
]

export default function NavBar() {
  const location = useLocation()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: '64px',
      background: '#ffffff', borderBottom: '1px solid #ffedd5',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 8px rgba(249,115,22,0.08)'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #fcd34d, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', boxShadow: '0 4px 10px rgba(249,115,22,0.3)'
        }}>☀</div>
        <span style={{ fontSize: '17px', fontWeight: 700 }}>
          <span style={{ color: '#1c1917' }}>Sun</span>
          <span style={{ color: '#f97316' }}>Guard</span>
        </span>
      </Link>

      {/* Nav Links */}
      <nav style={{ display: 'flex', gap: '4px' }}>
        {navItems.map(item => {
          const active = location.pathname === item.to
          return (
            <Link key={item.to} to={item.to} style={{
              padding: '8px 18px', borderRadius: '12px',
              fontSize: '14px', fontWeight: active ? 600 : 500,
              textDecoration: 'none', transition: 'all 0.2s',
              background: active ? '#fff7ed' : 'transparent',
              color: active ? '#f97316' : '#78716c',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = '#f97316' }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#78716c' }}}>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}