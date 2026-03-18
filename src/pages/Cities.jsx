import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'

const SUPPORTED_CITIES = [
  { name: 'Melbourne',      timezone: 'Australia/Melbourne', lat: -37.8136, lng: 144.9631 },
  { name: 'Sydney',         timezone: 'Australia/Sydney',    lat: -33.8688, lng: 151.2093 },
  { name: 'Brisbane',       timezone: 'Australia/Brisbane',  lat: -27.4698, lng: 153.0251 },
  { name: 'Perth',          timezone: 'Australia/Perth',     lat: -31.9505, lng: 115.8605 },
  { name: 'Adelaide',       timezone: 'Australia/Adelaide',  lat: -34.9285, lng: 138.6007 },
  { name: 'Canberra',       timezone: 'Australia/Sydney',    lat: -35.2809, lng: 149.1300 },
  { name: 'Hobart',         timezone: 'Australia/Hobart',    lat: -42.8821, lng: 147.3272 },
  { name: 'Darwin',         timezone: 'Australia/Darwin',    lat: -12.4634, lng: 130.8456 },
  { name: 'Gold Coast',     timezone: 'Australia/Brisbane',  lat: -28.0167, lng: 153.4000 },
  { name: 'Newcastle',      timezone: 'Australia/Sydney',    lat: -32.9283, lng: 151.7817 },
  { name: 'Wollongong',     timezone: 'Australia/Sydney',    lat: -34.4331, lng: 150.8831 },
  { name: 'Sunshine Coast', timezone: 'Australia/Brisbane',  lat: -26.6500, lng: 153.0667 },
  { name: 'Geelong',        timezone: 'Australia/Melbourne', lat: -38.1499, lng: 144.3617 },
  { name: 'Townsville',     timezone: 'Australia/Brisbane',  lat: -19.2590, lng: 146.8169 },
  { name: 'Cairns',         timezone: 'Australia/Brisbane',  lat: -16.9186, lng: 145.7781 },
  { name: 'Toowoomba',      timezone: 'Australia/Brisbane',  lat: -27.5598, lng: 151.9507 },
  { name: 'Ballarat',       timezone: 'Australia/Melbourne', lat: -37.5622, lng: 143.8503 },
  { name: 'Bendigo',        timezone: 'Australia/Melbourne', lat: -36.7570, lng: 144.2794 },
  { name: 'Launceston',     timezone: 'Australia/Hobart',    lat: -41.4332, lng: 147.1441 },
  { name: 'Mackay',         timezone: 'Australia/Brisbane',  lat: -21.1411, lng: 149.1860 },
]

const DEFAULT_CITIES = [
  { id: 'melbourne', name: 'Melbourne', timezone: 'Australia/Melbourne', country: 'Australia' },
]

const CACHE_KEY = 'sunsense_uv_cache'
const CACHE_TTL = 60 * 60 * 1000

function getCached(cityId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw)
    const entry = cache[cityId]
    if (!entry) return null
    if (Date.now() - entry.ts > CACHE_TTL) return null
    return entry.data
  } catch { return null }
}

function setCached(cityId, data) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache = raw ? JSON.parse(raw) : {}
    cache[cityId] = { ts: Date.now(), data }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  // eslint-disable-next-line no-unused-vars, no-empty
  } catch (err) {}
}

async function fetchCityUV(cityId, cityName, timezone) {
  const cached = getCached(cityId)
  if (cached) return cached
  const res = await fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city_name: cityName.toLowerCase(), timezone, sun_screen_efficiency: 0.8, skin_type: 3 })
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const parsed = { uvIndex: data.current_uv_index_time?.uv_index ?? 0, temperature: data.temperature ?? 0, weatherLabel: parseWeatherLabel(data.weather_label) }
  setCached(cityId, parsed)
  return parsed
}

function parseWeatherLabel(raw) {
  if (!raw) return 'Clear'
  const r = raw.toLowerCase()
  if (r.includes('clear'))        return 'Clear'
  if (r.includes('cloudy'))       return 'Cloudy'
  if (r.includes('fog'))          return 'Fog'
  if (r.includes('drizzle'))      return 'Drizzle'
  if (r.includes('rain'))         return 'Rain'
  if (r.includes('snow'))         return 'Snow'
  if (r.includes('thunderstorm')) return 'Thunderstorm'
  return 'Clear'
}

function getUVTheme(uvi) {
  if (uvi <= 2)  return { label: 'Low',       color: '#4eb400', bg: '#f0fdf4' }
  if (uvi <= 5)  return { label: 'Moderate',  color: '#f8b600', bg: '#fffbeb' }
  if (uvi <= 7)  return { label: 'High',      color: '#f88700', bg: '#fff7ed' }
  if (uvi <= 10) return { label: 'Very High', color: '#e82c0e', bg: '#fef2f2' }
  return               { label: 'Extreme',   color: '#b54cff', bg: '#faf5ff' }
}

function getWeatherIcon(label) {
  if (!label) return '🌤️'
  const l = label.toLowerCase()
  if (l.includes('clear'))        return '☀️'
  if (l.includes('cloudy'))       return '⛅'
  if (l.includes('fog'))          return '🌫️'
  if (l.includes('drizzle'))      return '🌦️'
  if (l.includes('rain'))         return '🌧️'
  if (l.includes('snow'))         return '❄️'
  if (l.includes('thunderstorm')) return '⛈️'
  return '🌤️'
}

function getWeatherDesc(label) {
  if (!label) return 'Unknown'
  const l = label.toLowerCase()
  if (l.includes('clear'))        return 'Clear sky'
  if (l.includes('cloudy'))       return 'Partly cloudy'
  if (l.includes('fog'))          return 'Foggy'
  if (l.includes('drizzle'))      return 'Drizzle'
  if (l.includes('rain'))         return 'Rain'
  if (l.includes('snow'))         return 'Snow'
  if (l.includes('thunderstorm')) return 'Thunderstorm'
  return 'Unknown'
}

function loadCities() {
  try { const s = localStorage.getItem('sunsense_cities'); return s ? JSON.parse(s) : DEFAULT_CITIES } catch { return DEFAULT_CITIES }
}
function saveCities(cities) { localStorage.setItem('sunsense_cities', JSON.stringify(cities)) }
function loadSelectedId(cities) {
  const saved = localStorage.getItem('sunsense_selected_city')
  if (saved && cities.find(c => c.id === saved)) return saved
  return cities[0]?.id ?? DEFAULT_CITIES[0].id
}
function saveSelectedId(id) { localStorage.setItem('sunsense_selected_city', id) }

export default function Cities() {
  const [cities, setCities]         = useState(loadCities)
  const [selectedId, setSelectedId] = useState(() => { const loaded = loadCities(); return loadSelectedId(loaded) })
  const [uvDataMap, setUvDataMap]   = useState({})
  const [loadingMap, setLoadingMap] = useState({})
  const [query, setQuery]           = useState('')
  const [dropdown, setDropdown]     = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [deleteWarning, setDeleteWarning] = useState(false)
  const [selectedToast, setSelectedToast] = useState(null) // { cityName }

  useEffect(() => {
    cities.forEach(async (city) => {
      setLoadingMap(prev => ({ ...prev, [city.id]: true }))
      try {
        const uv = await fetchCityUV(city.id, city.name, city.timezone)
        setUvDataMap(prev => ({ ...prev, [city.id]: uv }))
      } catch { /* keep empty */ }
      finally { setLoadingMap(prev => ({ ...prev, [city.id]: false })) }
    })
  }, [cities])

  useEffect(() => {
    if (cities.length > 0 && !cities.find(c => c.id === selectedId)) {
      const newId = cities[0].id; setSelectedId(newId); saveSelectedId(newId)
    }
  }, [cities, selectedId])

  const handleQueryChange = useCallback((e) => {
    const val = e.target.value; setQuery(val)
    if (!val.trim()) { setDropdown([]); return }
    setDropdown(SUPPORTED_CITIES.filter(c => c.name.toLowerCase().includes(val.toLowerCase())))
  }, [])

  const handleAdd = useCallback((city) => {
    if (cities.length >= 3) return
    const id = city.name.toLowerCase().replace(/\s+/g, '-')
    if (cities.find(c => c.id === id)) return
    const next = [...cities, { id, name: city.name, timezone: city.timezone, country: 'Australia' }]
    setCities(next); saveCities(next); setQuery(''); setDropdown([])
  }, [cities])

  const handleDelete = useCallback((id) => {
    if (cities.length <= 1) { setDeleteWarning(true); setTimeout(() => setDeleteWarning(false), 3000); return }
    setDeletingId(id)
    setTimeout(() => {
      const next = cities.filter(c => c.id !== id)
      setCities(next); saveCities(next); setDeletingId(null)
      if (selectedId === id) { const newId = next[0].id; setSelectedId(newId); saveSelectedId(newId) }
    }, 280)
  }, [cities, selectedId])

  const navigate      = useNavigate()
  const toastTimerRef = useRef(null)

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
    saveSelectedId(id)
    const city = cities.find(c => c.id === id)
    if (city) {
      setSelectedToast({ cityName: city.name })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setSelectedToast(null), 5000)
    }
  }, [cities])

  const isFull = cities.length >= 3

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '60px' }}>
      <style>{`
        .cities-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .cities-top-row {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          margin-bottom: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .cities-grid { grid-template-columns: 1fr !important; }
          .cities-top-row { grid-template-columns: 1fr !important; }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Selection success toast ── */}
      {selectedToast && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#1c1917',
          borderRadius: '16px',
          padding: '16px 22px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          display: 'flex', alignItems: 'center', gap: '16px',
          animation: 'toast-in 0.28s ease',
          minWidth: '320px', maxWidth: '92vw',
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
              Switched to {selectedToast.cityName}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', margin: 0 }}>
              View updated UV data on
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => { setSelectedToast(null); navigate('/home') }}
              style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#f97316', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >Home</button>
            <button
              onClick={() => { setSelectedToast(null); navigate('/detail') }}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >UV Detail</button>
          </div>
          <button
            onClick={() => setSelectedToast(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '16px', padding: '4px', flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Hero */}
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <video autoPlay muted loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 70%', zIndex: 0, pointerEvents: 'none' }}>
          <source src="/videos/City.mp4" type="video/mp4" />
        </video>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(26,5,0,0.50)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', padding: '0 clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '8px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>My Cities</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Track UV levels across up to 3 Australian locations</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '28px auto', padding: '0 clamp(20px, 4vw, 48px)' }}>

        {/* Search + info row */}
        <div className="cities-top-row">

          {/* Search box */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', position: 'relative' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>🔍 Add a City</p>
            {isFull && <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>Maximum 3 cities reached. Remove one to add another.</div>}
            {deleteWarning && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>At least one city is required.</div>}
            <input
              value={query} onChange={handleQueryChange}
              placeholder={isFull ? 'Remove a city to add another' : 'Search city — e.g. Sydney, Brisbane...'}
              disabled={isFull}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', color: '#1c1917', outline: 'none', background: isFull ? '#f9fafb' : '#fff', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#f97316'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            {dropdown.length > 0 && !isFull && (
              <div style={{ position: 'absolute', left: '24px', right: '24px', top: 'calc(100% - 8px)', background: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                {dropdown.map(city => {
                  const id = city.name.toLowerCase().replace(/\s+/g, '-')
                  const already = !!cities.find(c => c.id === id)
                  return (
                    <div key={city.name} onClick={() => !already && handleAdd(city)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', cursor: already ? 'default' : 'pointer', background: '#fff', borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!already) e.currentTarget.style.background = '#fff7ed' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', margin: 0 }}>{city.name}</p>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>Australia · {city.timezone}</p>
                      </div>
                      {already ? <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>✓ Added</span> : <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }}>+ Add</span>}
                    </div>
                  )
                })}
              </div>
            )}
            {query.trim() && dropdown.length === 0 && !isFull && <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>No matching cities found.</p>}
          </div>

          {/* Info panel */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', margin: 0 }}>UV varies across Australia</p>
            </div>
            <p style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.6, margin: 0 }}>Cities in Queensland and the NT regularly reach <strong>Extreme (11+)</strong> levels. Always check local UV before heading outdoors.</p>
          </div>
        </div>

        {/* How-to-select guide banner */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: '1px solid #fed7aa',
          borderRadius: '14px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>👆</div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', margin: '0 0 2px' }}>
              How to select your active city
            </p>
            <p style={{ fontSize: '12px', color: '#b45309', margin: 0, lineHeight: 1.6 }}>
              Click any city card below to set it as your active location. The selected city will be used across the <strong>Home</strong> and <strong>UV Detail</strong> pages.
            </p>
          </div>
        </div>

        {/* City cards grid */}
        <div className="cities-grid">
          {cities.map(city => {
            const uv       = uvDataMap[city.id]
            const loading  = loadingMap[city.id]
            const theme    = uv ? getUVTheme(uv.uvIndex) : null
            const icon     = uv ? getWeatherIcon(uv.weatherLabel) : '🌤️'
            const desc     = uv ? getWeatherDesc(uv.weatherLabel) : ''
            const active   = city.id === selectedId
            const deleting = city.id === deletingId
            const isLast   = cities.length <= 1

            return (
              <div key={city.id} onClick={() => handleSelect(city.id)}
                style={{ background: '#fff', borderRadius: '16px', border: active ? '2px solid #f97316' : '1px solid #f3f4f6', boxShadow: active ? '0 4px 20px rgba(249,115,22,0.15)' : '0 2px 12px rgba(0,0,0,0.06)', padding: '20px', cursor: 'pointer', transition: 'all 0.28s ease', opacity: deleting ? 0 : 1, transform: deleting ? 'translateY(-8px)' : 'none', position: 'relative', overflow: 'hidden' }}
              >
                {active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#f97316', borderRadius: '4px 0 0 4px' }} />}

                {/* Top row: weather icon + UV badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '36px', lineHeight: 1 }}>{loading ? '⏳' : icon}</span>
                  {uv && theme && !loading && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: theme.color, lineHeight: 1, margin: 0 }}>{Math.round(uv.uvIndex)}</p>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', color: theme.color, background: theme.bg }}>{theme.label}</span>
                    </div>
                  )}
                  {loading && <p style={{ fontSize: '12px', color: '#d1d5db' }}>Loading...</p>}
                </div>

                {/* City name + meta */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#1c1917', margin: 0 }}>{city.name}</p>
                    {active && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: '#fff7ed', color: '#f97316' }}>Active</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{city.country}</p>
                  {uv && !loading && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>{uv.temperature}° · {desc}</p>}
                </div>

                {/* UV label label bar */}
                {uv && theme && !loading && (
                  <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ width: `${Math.min(100, (uv.uvIndex / 11) * 100)}%`, height: '100%', background: theme.color, borderRadius: '99px' }} />
                  </div>
                )}

                {/* Footer: delete */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={e => { e.stopPropagation(); handleDelete(city.id) }}
                    title={isLast ? 'Cannot remove the last city' : 'Remove city'}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: isLast ? '#f9fafb' : '#fef2f2', border: `1px solid ${isLast ? '#e5e7eb' : '#fecaca'}`, color: isLast ? '#d1d5db' : '#ef4444', fontSize: '12px', cursor: isLast ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (!isLast) e.currentTarget.style.background = '#fee2e2' }}
                    onMouseLeave={e => { if (!isLast) e.currentTarget.style.background = '#fef2f2' }}
                  >✕</button>
                </div>
              </div>
            )
          })}

          {/* Empty slot placeholders */}
          {cities.length < 3 && Array.from({ length: 3 - cities.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ borderRadius: '16px', border: '2px dashed #e5e7eb', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', color: '#d1d5db', gap: '8px' }}>
              <span style={{ fontSize: '28px' }}>＋</span>
              <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Add a city</p>
              <p style={{ fontSize: '11px', margin: 0 }}>Search above</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>After selecting a city, view updated data on</span>
          <button onClick={() => navigate('/home')} style={{ fontSize: '12px', fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}>Home</button>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>or</span>
          <button onClick={() => navigate('/detail')} style={{ fontSize: '12px', fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}>UV Detail</button>
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer />

    </div>
  )
}