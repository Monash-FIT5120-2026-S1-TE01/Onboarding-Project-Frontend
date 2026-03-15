import { Link } from 'react-router-dom'

export default function NavBar() {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
      padding: '0 40px', height: '64px',
      background: '#ffffff', borderBottom: '1px solid #ffedd5',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 8px rgba(249,115,22,0.08)'
    }}>
      {/* Logo only */}
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
    </header>
  )
}