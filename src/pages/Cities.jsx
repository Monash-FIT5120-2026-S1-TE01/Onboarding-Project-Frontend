import { PageSpinner, PageError } from '../components/PageStatus'
import { useState, useEffect, useCallback } from 'react'

// ── City whitelist ────────────────────────────────────────────
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
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in ms

// ── Cache helpers ─────────────────────────────────────────────
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
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // ignore cache errors
  }
}

// ── API request ───────────────────────────────────────────────
async function fetchCityUV(cityId, cityName, timezone) {
  const cached = getCached(cityId)
  if (cached) return cached

  const res = await fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city_name:             cityName.toLowerCase(),
      timezone:              timezone,
      sun_screen_efficiency: 0.8,
      skin_type:             3,
    })
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const parsed = {
    uvIndex:      data.current_uv_index_time?.uv_index ?? 0,
    temperature:  data.temperature ?? 0,
    weatherLabel: parseWeatherLabel(data.weather_label),
  }
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

// ── Utility functions ─────────────────────────────────────────
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
  try {
    const s = localStorage.getItem('sunsense_cities')
    return s ? JSON.parse(s) : DEFAULT_CITIES
  } catch { return DEFAULT_CITIES }
}

function saveCities(cities) {
  localStorage.setItem('sunsense_cities', JSON.stringify(cities))
}

function loadSelectedId(cities) {
  const saved = localStorage.getItem('sunsense_selected_city')
  // Ensure selected city actually exists in list
  if (saved && cities.find(c => c.id === saved)) return saved
  return cities[0]?.id ?? DEFAULT_CITIES[0].id
}

function saveSelectedId(id) {
  localStorage.setItem('sunsense_selected_city', id)
}

// ── Main component ────────────────────────────────────────────
export default function Cities() {
  const [cities, setCities]         = useState(loadCities)
  const [selectedId, setSelectedId] = useState(() => {
    const loaded = loadCities()
    return loadSelectedId(loaded)
  })
  const [uvDataMap, setUvDataMap]   = useState({})
  const [loadingMap, setLoadingMap] = useState({})
  const [query, setQuery]           = useState('')
  const [dropdown, setDropdown]     = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [deleteWarning, setDeleteWarning] = useState(false)

  // Load UV data for each city (with cache) ───────────────────
  useEffect(() => {
    cities.forEach(async (city) => {
      setLoadingMap(prev => ({ ...prev, [city.id]: true }))
      try {
        const uv = await fetchCityUV(city.id, city.name, city.timezone)
        setUvDataMap(prev => ({ ...prev, [city.id]: uv }))
      } catch {
        // Keep empty state on failure
      } finally {
        setLoadingMap(prev => ({ ...prev, [city.id]: false }))
      }
    })
  }, [cities])

  // Always keep selectedId in sync with cities list ───────────
  useEffect(() => {
    if (cities.length > 0 && !cities.find(c => c.id === selectedId)) {
      const newId = cities[0].id
      setSelectedId(newId)
      saveSelectedId(newId)
    }
  }, [cities, selectedId])

  // Local search filter ────────────────────────────────────────
  const handleQueryChange = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) { setDropdown([]); return }
    setDropdown(
      SUPPORTED_CITIES.filter(c =>
        c.name.toLowerCase().includes(val.toLowerCase())
      )
    )
  }, [])

  const handleAdd = useCallback((city) => {
    if (cities.length >= 3) return
    const id = city.name.toLowerCase().replace(/\s+/g, '-')
    if (cities.find(c => c.id === id)) return
    const next = [...cities, { id, name: city.name, timezone: city.timezone, country: 'Australia' }]
    setCities(next)
    saveCities(next)
    setQuery('')
    setDropdown([])
  }, [cities])

  // Prevent deleting the last city (fix #5) ───────────────────
  const handleDelete = useCallback((id) => {
    if (cities.length <= 1) {
      setDeleteWarning(true)
      setTimeout(() => setDeleteWarning(false), 3000)
      return
    }
    setDeletingId(id)
    setTimeout(() => {
      const next = cities.filter(c => c.id !== id)
      setCities(next)
      saveCities(next)
      setDeletingId(null)
      // If deleted city was selected, select first remaining
      if (selectedId === id) {
        const newId = next[0].id
        setSelectedId(newId)
        saveSelectedId(newId)
      }
    }, 280)
  }, [cities, selectedId])

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
    saveSelectedId(id)
  }, [])

  const isFull = cities.length >= 3

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '40px' }}>

      {/* Hero with City.mp4 background */}
      <div style={{
        position: 'relative', height: '200px',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}>
        <video autoPlay muted loop playsInline style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 70%',
          zIndex: 0, pointerEvents: 'none',
        }}>
          <source src="/videos/City.mp4" type="video/mp4" />
        </video>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(26,5,0,0.50)', pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '60px', zIndex: 2,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.2))',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'flex-end', padding: '0 24px 24px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, fontFamily: 'Georgia, serif', marginBottom: '6px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              My Cities
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Track UV levels across up to 3 locations
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '16px auto 0', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Search box with local dropdown */}
        <div style={{
          background: '#fff', borderRadius: '20px', padding: '16px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
          position: 'relative',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            🔍 SEARCH CITY
          </p>

          {isFull && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>
              Maximum 3 cities reached. Remove one to add another.
            </div>
          )}

          {/* Delete warning toast (fix #5) */}
          {deleteWarning && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>
              At least one city is required. You cannot remove all cities.
            </div>
          )}

          <input
            value={query}
            onChange={handleQueryChange}
            placeholder={isFull ? 'Remove a city to add another' : 'e.g. Sydney, Brisbane...'}
            disabled={isFull}
            style={{
              width: '100%', padding: '10px 14px',
              border: '1.5px solid #e5e7eb', borderRadius: '12px',
              fontSize: '14px', color: '#1c1917', outline: 'none',
              background: isFull ? '#f9fafb' : '#fff',
              transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#f97316'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />

          {dropdown.length > 0 && !isFull && (
            <div style={{
              position: 'absolute', left: '20px', right: '20px',
              top: 'calc(100% - 8px)',
              background: '#fff', borderRadius: '12px',
              border: '1px solid #f3f4f6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100, overflow: 'hidden',
            }}>
              {dropdown.map(city => {
                const id = city.name.toLowerCase().replace(/\s+/g, '-')
                const already = !!cities.find(c => c.id === id)
                return (
                  <div
                    key={city.name}
                    onClick={() => !already && handleAdd(city)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 16px', cursor: already ? 'default' : 'pointer',
                      background: '#fff', borderBottom: '1px solid #f9fafb', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!already) e.currentTarget.style.background = '#fff7ed' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', margin: 0 }}>{city.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>Australia · {city.timezone}</p>
                    </div>
                    {already
                      ? <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>✓ Added</span>
                      : <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }}>+ Add</span>
                    }
                  </div>
                )
              })}
            </div>
          )}

          {query.trim() && dropdown.length === 0 && !isFull && (
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>No matching cities found.</p>
          )}
        </div>

        {/* City list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <div
                key={city.id}
                onClick={() => handleSelect(city.id)}
                style={{
                  background: '#fff', borderRadius: '20px',
                  border: active ? '2px solid #f97316' : '1px solid #f3f4f6',
                  boxShadow: active ? '0 4px 20px rgba(249,115,22,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '16px 20px', cursor: 'pointer',
                  transition: 'all 0.28s ease',
                  opacity: deleting ? 0 : 1,
                  transform: deleting ? 'translateX(40px)' : 'none',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {active && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#f97316', borderRadius: '4px 0 0 4px' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '32px', lineHeight: 1 }}>{loading ? '⏳' : icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '17px', fontWeight: 700, color: '#1c1917' }}>{city.name}</p>
                        {active && (
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: '#fff7ed', color: '#f97316' }}>Selected</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{city.country}</p>
                      {uv && !loading && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          {uv.temperature}° · {desc}
                        </p>
                      )}
                      {loading && <p style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>Loading...</p>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {uv && theme && !loading && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>UV INDEX</p>
                        <p style={{ fontSize: '26px', fontWeight: 700, color: theme.color, lineHeight: 1 }}>
                          {Math.round(uv.uvIndex)}
                        </p>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', color: theme.color, background: theme.bg }}>
                          {theme.label}
                        </span>
                      </div>
                    )}

                    {/* Show disabled delete button if last city (fix #5) */}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(city.id) }}
                      title={isLast ? 'Cannot remove the last city' : 'Remove city'}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isLast ? '#f9fafb' : '#fef2f2',
                        border: `1px solid ${isLast ? '#e5e7eb' : '#fecaca'}`,
                        color: isLast ? '#d1d5db' : '#ef4444',
                        fontSize: '14px', cursor: isLast ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { if (!isLast) e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={e => { if (!isLast) e.currentTarget.style.background = '#fef2f2' }}
                    >✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>
          Tap a city to set it as your active location
        </p>

        {/* Info card */}
        <div style={{ marginTop: '8px' }}>
          <div style={{
            borderRadius: '16px', padding: '16px 20px',
            background: '#fffbeb', border: '1px solid #fde68a',
            display: 'flex', alignItems: 'flex-start', gap: '12px'
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
            <p style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.6, margin: 0 }}>
              UV levels vary significantly across Australia. Cities in Queensland and the Northern Territory regularly reach <strong>Extreme (11+)</strong> levels. Always check the local UV Index before heading outdoors, especially if you're travelling between cities.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}