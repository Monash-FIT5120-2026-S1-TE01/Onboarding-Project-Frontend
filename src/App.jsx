import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Landing from './pages/Landing.jsx'
import Home from './pages/Home'
import Cities from './pages/Cities'
import Detail from './pages/Detail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page independent, does not have NavBar. */}
        <Route path="/" element={<Landing />} />

        {/* Other pages have NavBar */}
        <Route path="/*" element={
          <div className="min-h-screen flex flex-col bg-white">
            <NavBar />
            <main className="flex-1 pb-20 md:pb-0">
              <Routes>
                <Route path="/home"    element={<Home />} />
                <Route path="/cities"  element={<Cities />} />
                <Route path="/detail"  element={<Detail />} />
              </Routes>
            </main>
            <MobileTabBar />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

function MobileTabBar() {
  const items = [
    { to: '/home',    emoji: '🏠', label: 'Home'    },
    { to: '/cities',  emoji: '🏙️', label: 'Cities'  },
    { to: '/detail',  emoji: '📊', label: 'Detail'  },
  ]
  const current = window.location.pathname

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      height: '64px', padding: '0 16px'
    }}>
      {items.map(item => (
        <a key={item.to} href={item.to} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          textDecoration: 'none', fontSize: '10px', fontWeight: 500,
          color: current === item.to ? '#f97316' : '#78716c',
          transition: 'color 0.2s'
        }}>
          <span style={{ fontSize: '22px' }}>{item.emoji}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  )
}