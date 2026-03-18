import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import Landing from './pages/Landing.jsx'
import Home from './pages/Home'
import Cities from './pages/Cities'
import Detail from './pages/Detail'
import PasswordGate from './pages/PasswordGate.jsx'

const AUTH_KEY = 'sunsense_auth'

function RequireAuth({ children }) {
  const location = useLocation()
  const isAuthed = sessionStorage.getItem(AUTH_KEY) === '1'
  if (!isAuthed) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<PasswordGate />} />
        <Route path="/*" element={
          <RequireAuth>
            <div className="min-h-screen flex flex-col bg-white">
              <NavBar />
              <main className="flex-1">
                <Routes>
                  <Route path="/home"   element={<Home />} />
                  <Route path="/cities" element={<Cities />} />
                  <Route path="/detail" element={<Detail />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}