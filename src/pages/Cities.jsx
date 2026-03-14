import { useState, useEffect, useCallback } from 'react'

// ── 默认预置城市（首次访问）──────────────────────────────────
const DEFAULT_CITIES = [
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
]

// ── Mock UV 数据生成（Commit 4 替换为真实批量 API）────────────
function getMockUVData(cityName) {
  const mock = {
    Melbourne: { uvIndex: 4.45, temperature: 28, weatherCode: 1 },
    Sydney:    { uvIndex: 6.10, temperature: 32, weatherCode: 0 },
    Adelaide:  { uvIndex: 3.20, temperature: 16, weatherCode: 61 },
    Brisbane:  { uvIndex: 7.80, temperature: 30, weatherCode: 1 },
    Perth:     { uvIndex: 9.00, temperature: 35, weatherCode: 0 },
    Hobart:    { uvIndex: 2.10, temperature: 14, weatherCode: 3 },
    Darwin:    { uvIndex: 11.0, temperature: 33, weatherCode: 80 },
    Canberra:  { uvIndex: 5.50, temperature: 22, weatherCode: 2 },
  }
  return mock[cityName] ?? { uvIndex: 5.0, temperature: 25, weatherCode: 1 }
}

// ── 工具函数 ──────────────────────────────────────────────────
function getUVTheme(uvi) {
  if (uvi <= 2)  return { label: 'Low',       color: '#4eb400', bg: '#f0fdf4' }
  if (uvi <= 5)  return { label: 'Moderate',  color: '#f8b600', bg: '#fffbeb' }
  if (uvi <= 7)  return { label: 'High',      color: '#f88700', bg: '#fff7ed' }
  if (uvi <= 10) return { label: 'Very High', color: '#e82c0e', bg: '#fef2f2' }
  return               { label: 'Extreme',   color: '#b54cff', bg: '#faf5ff' }
}

function getWeatherIcon(code) {
  if (code === 0)                          return '☀️'
  if ([1, 2, 3].includes(code))            return '⛅'
  if ([45, 48].includes(code))             return '🌫️'
  if ([51,53,55,56,57].includes(code))     return '🌦️'
  if ([61,63,65,66,67].includes(code))     return '🌧️'
  if ([71,73,75,77].includes(code))        return '❄️'
  if ([80,81,82].includes(code))           return '🌩️'
  if ([95,96,99].includes(code))           return '⛈️'
  return '🌤️'
}

function getWeatherDesc(code) {
  if (code === 0)                          return 'Clear sky'
  if ([1, 2, 3].includes(code))            return 'Partly cloudy'
  if ([45, 48].includes(code))             return 'Foggy'
  if ([51,53,55,56,57].includes(code))     return 'Drizzle'
  if ([61,63,65,66,67].includes(code))     return 'Rain'
  if ([71,73,75,77].includes(code))        return 'Snow'
  if ([80,81,82].includes(code))           return 'Showers'
  if ([95,96,99].includes(code))           return 'Thunderstorm'
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

function loadSelectedId() {
  return localStorage.getItem('sunsense_selected_city') ?? DEFAULT_CITIES[0].id
}

function saveSelectedId(id) {
  localStorage.setItem('sunsense_selected_city', id)
}

// ── 主组件 ────────────────────────────────────────────────────
export default function Cities() {
  const [cities, setCities]         = useState(loadCities)
  const [selectedId, setSelectedId] = useState(loadSelectedId)
  const [uvDataMap, setUvDataMap]   = useState({})
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [searchErr, setSearchErr]   = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // 加载各城市 mock UV 数据
  useEffect(() => {
    const map = {}
    cities.forEach(c => { map[c.id] = getMockUVData(c.name) })
    setUvDataMap(map)
  }, [cities])

  // 搜索澳洲城市
  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchErr('')
    setResults([])
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
      const res  = await fetch(url)
      const json = await res.json()

      // 严格过滤：只保留 country_code === 'AU' 的结果
      const auResults = (json.results ?? []).filter(r => r.country_code === 'AU')
      if (!auResults.length) {
        setSearchErr('No Australian cities found. Try another name.')
        setSearching(false)
        return
      }
      setResults(auResults.map(r => ({
        id:      `${r.name.toLowerCase().replace(/\s+/g, '-')}-${r.id}`,
        name:    r.name,
        country: r.country ?? 'Australia',
        state:   r.admin1 ?? '',
        lat:     r.latitude,
        lng:     r.longitude,
      })))
    } catch {
      setSearchErr('Search failed. Please check your connection.')
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

  const handleAdd = useCallback((city) => {
    if (cities.length >= 3) return
    if (cities.find(c => c.id === city.id)) return
    const next = [...cities, {
      id: city.id, name: city.name,
      country: city.country, lat: city.lat, lng: city.lng
    }]
    setCities(next)
    saveCities(next)
    setResults([])
    setQuery('')
  }, [cities])

  const handleDelete = useCallback((id) => {
    setDeletingId(id)
    setTimeout(() => {
      const next = cities.filter(c => c.id !== id)
      setCities(next)
      saveCities(next)
      setDeletingId(null)
      if (selectedId === id && next.length > 0) {
        setSelectedId(next[0].id)
        saveSelectedId(next[0].id)
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

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0500 0%, #7c2d0a 50%, #f97316 100%)',
        padding: '28px 24px 40px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,186,116,0.35) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{
            color: '#fff', fontSize: '28px', fontWeight: 700,
            fontFamily: 'Georgia, serif', marginBottom: '6px'
          }}>
            My Cities
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            Track UV levels across up to 3 locations
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '680px', margin: '16px auto 0',
        padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>

        {/* ── 搜索框 ── */}
        <div style={{
          background: '#fff', borderRadius: '20px', padding: '16px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6'
        }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, color: '#9ca3af',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px'
          }}>
            🔍 SEARCH CITY
          </p>

          {isFull && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', color: '#92400e', marginBottom: '12px'
            }}>
              Maximum 3 cities reached. Remove one to add another.
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Sydney, Brisbane..."
              disabled={isFull}
              style={{
                flex: 1, padding: '10px 14px',
                border: '1.5px solid #e5e7eb', borderRadius: '12px',
                fontSize: '14px', color: '#1c1917', outline: 'none',
                background: isFull ? '#f9fafb' : '#fff',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#f97316'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              onClick={handleSearch}
              disabled={isFull || searching}
              style={{
                padding: '10px 20px', borderRadius: '12px',
                background: isFull ? '#e5e7eb' : 'linear-gradient(135deg, #f97316, #c2410c)',
                color: isFull ? '#9ca3af' : '#fff',
                border: 'none', fontWeight: 600, fontSize: '14px',
                cursor: isFull ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}>
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {searchErr && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '10px' }}>{searchErr}</p>
          )}

          {/* 搜索结果列表 */}
          {results.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map(r => {
                const already = !!cities.find(c => c.id === r.id)
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '12px',
                    background: '#f9fafb', border: '1px solid #f3f4f6'
                  }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>{r.name}</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {r.state ? `${r.state}, ` : ''}{r.country}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(r)}
                      disabled={already || isFull}
                      style={{
                        padding: '6px 14px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600, border: 'none',
                        cursor: already || isFull ? 'default' : 'pointer',
                        background: already ? '#f0fdf4' : isFull ? '#f3f4f6' : 'linear-gradient(135deg, #f97316, #c2410c)',
                        color: already ? '#16a34a' : isFull ? '#9ca3af' : '#fff',
                        transition: 'all 0.2s'
                      }}>
                      {already ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 城市列表 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cities.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: '20px', padding: '40px 20px',
              textAlign: 'center', border: '1px solid #f3f4f6',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
            }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌏</p>
              <p style={{ fontSize: '15px', color: '#6b7280', fontWeight: 500 }}>No cities added yet</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                Search above to add your first city
              </p>
            </div>
          )}

          {cities.map(city => {
            const uv       = uvDataMap[city.id]
            const theme    = uv ? getUVTheme(uv.uvIndex) : null
            const icon     = uv ? getWeatherIcon(uv.weatherCode) : '🌤️'
            const desc     = uv ? getWeatherDesc(uv.weatherCode) : ''
            const active   = city.id === selectedId
            const deleting = city.id === deletingId

            return (
              <div
                key={city.id}
                onClick={() => handleSelect(city.id)}
                style={{
                  background: '#fff', borderRadius: '20px',
                  border: active ? '2px solid #f97316' : '1px solid #f3f4f6',
                  boxShadow: active
                    ? '0 4px 20px rgba(249,115,22,0.15)'
                    : '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.28s ease',
                  opacity: deleting ? 0 : 1,
                  transform: deleting ? 'translateX(40px)' : 'none',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {/* 选中指示条 */}
                {active && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: '4px', background: '#f97316', borderRadius: '4px 0 0 4px'
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* 左：城市信息 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '32px', lineHeight: 1 }}>{icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '17px', fontWeight: 700, color: '#1c1917' }}>{city.name}</p>
                        {active && (
                          <span style={{
                            fontSize: '10px', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '99px',
                            background: '#fff7ed', color: '#f97316'
                          }}>Selected</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{city.country}</p>
                      {uv && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          {uv.temperature}° · {desc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右：UV + 删除 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {uv && theme && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '2px' }}>
                        <p style={{
                          fontSize: '10px', color: '#9ca3af',
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>UV INDEX</p>
                        <p style={{ fontSize: '26px', fontWeight: 700, color: theme.color, lineHeight: 1 }}>
                          {uv.uvIndex.toFixed(1)}
                        </p>
                        <span style={{
                          fontSize: '10px', fontWeight: 600,
                          padding: '2px 8px', borderRadius: '99px',
                          color: theme.color, background: theme.bg
                        }}>{theme.label}</span>
                      </div>
                    )}

                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(city.id) }}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        color: '#ef4444', fontSize: '14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                      title="Remove city"
                    >✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {cities.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>
            Tap a city to set it as your active location
          </p>
        )}

        {/* ── 信息卡片区 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>

          {/* 提示卡片 */}
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