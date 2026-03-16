import { useState, useEffect, useCallback, useRef } from 'react'

// ── City whitelist (for timezone lookup) ─────────────────────
const SUPPORTED_CITIES = [
  { name: 'Melbourne',      timezone: 'Australia/Melbourne' },
  { name: 'Sydney',         timezone: 'Australia/Sydney'    },
  { name: 'Brisbane',       timezone: 'Australia/Brisbane'  },
  { name: 'Perth',          timezone: 'Australia/Perth'     },
  { name: 'Adelaide',       timezone: 'Australia/Adelaide'  },
  { name: 'Canberra',       timezone: 'Australia/Sydney'    },
  { name: 'Hobart',         timezone: 'Australia/Hobart'    },
  { name: 'Darwin',         timezone: 'Australia/Darwin'    },
  { name: 'Gold Coast',     timezone: 'Australia/Brisbane'  },
  { name: 'Newcastle',      timezone: 'Australia/Sydney'    },
  { name: 'Wollongong',     timezone: 'Australia/Sydney'    },
  { name: 'Sunshine Coast', timezone: 'Australia/Brisbane'  },
  { name: 'Geelong',        timezone: 'Australia/Melbourne' },
  { name: 'Townsville',     timezone: 'Australia/Brisbane'  },
  { name: 'Cairns',         timezone: 'Australia/Brisbane'  },
  { name: 'Toowoomba',      timezone: 'Australia/Brisbane'  },
  { name: 'Ballarat',       timezone: 'Australia/Melbourne' },
  { name: 'Bendigo',        timezone: 'Australia/Melbourne' },
  { name: 'Launceston',     timezone: 'Australia/Hobart'    },
  { name: 'Mackay',         timezone: 'Australia/Brisbane'  },
]

const CACHE_KEY = 'sunsense_uv_cache_home'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in ms


const alertedCities = new Set()

function getTimezone(cityName) {
  const found = SUPPORTED_CITIES.find(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  )
  return found?.timezone ?? 'Australia/Sydney'
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

// ── Weather video mapping ─────────────────────────────────────
function getWeatherVideo(label) {
  if (!label) return '/videos/Clear.mp4'
  const l = label.toLowerCase()
  if (l.includes('clear'))        return '/videos/Clear.mp4'
  if (l.includes('cloudy'))       return '/videos/Cloudy.mp4'
  if (l.includes('fog'))          return '/videos/Fog.mp4'
  if (l.includes('drizzle'))      return '/videos/Drizzle.mp4'
  if (l.includes('rain'))         return '/videos/Rain.mp4'
  if (l.includes('snow'))         return '/videos/Snow.mp4'
  if (l.includes('thunderstorm')) return '/videos/Thunderstorm.mp4'
  return '/videos/Clear.mp4'
}

// ── UV theme (WHO/WMO standard) ───────────────────────────────
function getUVTheme(uvi) {
  if (uvi <= 2) return {
    label: 'Low',
    color: '#4eb400',
    overlayColor: 'rgba(26, 58, 0, 0.45)',
  }
  if (uvi <= 5) return {
    label: 'Moderate',
    color: '#f7e400',
    overlayColor: 'rgba(58, 46, 0, 0.45)',
  }
  if (uvi <= 7) return {
    label: 'High',
    color: '#f88700',
    overlayColor: 'rgba(58, 21, 0, 0.45)',
  }
  if (uvi <= 10) return {
    label: 'Very High',
    color: '#e82c0e',
    overlayColor: 'rgba(42, 0, 0, 0.50)',
  }
  return {
    label: 'Extreme',
    color: '#b54cff',
    overlayColor: 'rgba(26, 0, 48, 0.50)',
  }
}

// ── UV progress bar gradient (WHO 11-color standard) ──────────
const UV_BAR_STOPS = [
  '#4eb400', '#a0ce00', '#f7e400',
  '#f8b600', '#f88700', '#f85900',
  '#e82c0e', '#d8001d', '#ff0099',
  '#b54cff', '#998cff',
]
function getBarGradient(uvi) {
  const pct = Math.min(1, uvi / 11)
  const stopCount = Math.max(2, Math.ceil(pct * UV_BAR_STOPS.length))
  const stops = UV_BAR_STOPS.slice(0, stopCount)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

function getWeatherInfo(label) {
  if (!label) return { icon: '🌤️', desc: 'Unknown' }
  const l = label.toLowerCase()
  if (l.includes('clear'))        return { icon: '☀️',  desc: 'Clear sky' }
  if (l.includes('cloudy'))       return { icon: '⛅',  desc: 'Partly cloudy' }
  if (l.includes('fog'))          return { icon: '🌫️', desc: 'Foggy' }
  if (l.includes('drizzle'))      return { icon: '🌦️', desc: 'Drizzle' }
  if (l.includes('rain'))         return { icon: '🌧️', desc: 'Rain' }
  if (l.includes('snow'))         return { icon: '❄️',  desc: 'Snow' }
  if (l.includes('thunderstorm')) return { icon: '⛈️', desc: 'Thunderstorm' }
  return { icon: '🌤️', desc: 'Unknown' }
}

// ── Safe sun time formatter ───────────────────────────────────
function formatTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 min'
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`
  const totalHours = totalMinutes / 60
  if (totalHours >= 24) return '> 1 day'
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const REAPPLY_MS = 120 * 60 * 1000

const UNIVERSAL_TIPS = [
  'Seek shade whenever possible, especially around midday.',
  'Check the UV Index regularly, even on cloudy days.',
]

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

// ── UV alert content by level ─────────────────────────────────
// spf is passed in so modal text always matches the SPF card
function getUVAlertContent(uvi, spf) {
  if (uvi > 2 && uvi <= 5) return {
    icon: '🧴',
    borderColor: '#fbbf24',
    iconBg: '#fef3c7',
    heading: 'Moderate UV — Take Care',
    body: `UV levels are moderate right now. If you're heading outdoors for more than 20 minutes, it's a good idea to apply SPF ${spf}+ sunscreen and wear a hat.`,
  }
  if (uvi > 5 && uvi <= 7) return {
    icon: '⚠️',
    borderColor: '#f97316',
    iconBg: '#fff7ed',
    heading: 'High UV — Protection Needed',
    body: `UV levels are high today. Apply SPF ${spf}+ before going outside, seek shade between 10am and 4pm, and protect yourself with a hat and sunglasses.`,
  }
  if (uvi > 7 && uvi <= 10) return {
    icon: '🚨',
    borderColor: '#ef4444',
    iconBg: '#fef2f2',
    heading: 'Very High UV — Stay Protected',
    body: `UV is very high. Minimise time outdoors, apply SPF ${spf}+, and cover exposed skin with clothing, a wide-brim hat, and sunglasses. Reapply sunscreen every 2 hours.`,
  }
  // Extreme (> 10)
  return {
    icon: '☠️',
    borderColor: '#a855f7',
    iconBg: '#faf5ff',
    heading: 'Extreme UV — Avoid Outdoor Exposure',
    body: `UV levels are extreme. It is strongly advised to stay indoors during peak hours. If you must go outside, wear SPF ${spf}+, full-coverage clothing, sunglasses, and a hat — and limit your time exposed.`,
  }
}

// ── Main component ────────────────────────────────────────────
export default function Home() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [now, setNow]         = useState(new Date())
  const [lastApplied, setLastApplied] = useState(() => {
    const s = localStorage.getItem('sunsense_last_applied')
    return s ? parseInt(s) : null
  })
  const [showBanner, setShowBanner]       = useState(false)
  const [showDonePopup, setShowDonePopup] = useState(false)
  const notifiedRef = useRef(false)
  const [showUVAlert, setShowUVAlert] = useState(false)

  // ── Fetch UV data with 1-hour cache ──────────────────────────
  useEffect(() => {
    const cityId   = localStorage.getItem('sunsense_selected_city') ?? 'melbourne'
    const stored   = localStorage.getItem('sunsense_cities')
    const cities   = stored ? JSON.parse(stored) : []
    const city     = cities.find(c => c.id === cityId)
    const cityName = city?.name ?? 'Melbourne'
    const timezone = city?.timezone ?? getTimezone(cityName)

    // Clear this city's alert record on every city switch so
    // the alert fires once each time the user switches to it.
    alertedCities.delete(cityId)

    // ── Show alert once per city switch ──────────────────────
    function maybeShowUVAlert(uvIndex) {
      if ((uvIndex ?? 0) >= 3 && !alertedCities.has(cityId)) {
        alertedCities.add(cityId)
        setShowUVAlert(true)
      }
    }

    // Check cache first — only use if it contains full Home page data
    const cached = getCached(cityId)
    if (cached && cached.safeSunTime !== undefined && cached.cityName) {
      setData(cached)
      maybeShowUVAlert(cached.uvIndex)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city_name:             cityName.toLowerCase(),
        timezone:              timezone,
        sun_screen_efficiency: 0.3,
        skin_type:             3,
      })
    })
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(res => {
        const parsed = {
          cityName:      cityName,
          temperature:   res.temperature ?? 0,
          weatherLabel:  parseWeatherLabel(res.weather_label),
          uvIndex:       res.current_uv_index_time?.uv_index ?? 0,
          safeSunTime:   res.safe_time ?? 0,
          spf:           res.spf ?? 0,
          spfSuggestion: 'Broad-spectrum sunscreen is preferred.',
        }
        setCached(cityId, parsed)
        setData(parsed)
        console.log('[SunGuard] Raw API response for', cityName, ':', JSON.stringify(res, null, 2))
        console.log('[SunGuard] Parsed data:', JSON.stringify(parsed, null, 2))
        maybeShowUVAlert(parsed.uvIndex)
        setLoading(false)
      })
      .catch(() => {
        setError('Unable to load UV data. Please check your connection.')
        setLoading(false)
      })
  }, [])

  // ── Clock tick ────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Reapply reminder ──────────────────────────────────────────
  useEffect(() => {
    if (!lastApplied) return
    const elapsed = Date.now() - lastApplied
    if (elapsed >= REAPPLY_MS && !notifiedRef.current) {
      notifiedRef.current = true
      setShowBanner(true)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SunGuard ☀️', {
          body: 'Time to reapply your sunscreen! SPF 30+ recommended.',
          icon: '/favicon.svg'
        })
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('SunGuard ☀️', {
              body: 'Time to reapply your sunscreen! SPF 30+ recommended.',
              icon: '/favicon.svg'
            })
          }
        })
      }
    }
  }, [now, lastApplied])

  const handleDone = useCallback(() => {
    const ts = Date.now()
    setLastApplied(ts)
    localStorage.setItem('sunsense_last_applied', String(ts))
    setShowBanner(false)
    setShowDonePopup(true)
    notifiedRef.current = false
  }, [])

  // ── Loading / Error states ────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>☀️</p>
        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading UV data...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</p>
        <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  )

  // ── Derived values ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/purity
  const elapsed    = lastApplied ? Date.now() - lastApplied : null
  const elapsedMin = elapsed ? Math.floor(elapsed / 60000) : null
  const reapplyIn  = elapsed ? Math.max(0, Math.floor((REAPPLY_MS - elapsed) / 60000)) : null
  const progress   = elapsed ? Math.min(1, elapsed / REAPPLY_MS) : 0
  const isOverdue  = elapsed && elapsed >= REAPPLY_MS
  const almostTime = elapsed && elapsed >= REAPPLY_MS * 0.75

  const theme    = getUVTheme(data.uvIndex)
  const weather  = getWeatherInfo(data.weatherLabel)
  const videoSrc = getWeatherVideo(data.weatherLabel)
  const uvBarW   = `${Math.min(100, (data.uvIndex / 11) * 100)}%`
  const uvDisplay = Math.round(data.uvIndex)

  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const hasModal = showBanner || showDonePopup || showUVAlert

  const spfDisplay = (!data.spf || data.spf === 0)

  // Pass data.spf into alert content so all SPF values are consistent
  const uvAlertContent = showUVAlert ? getUVAlertContent(data.uvIndex, data.spf) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '40px', position: 'relative' }}>

      {hasModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 998, backdropFilter: 'blur(2px)'
        }} />
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* UV Alert Modal */}
      {showUVAlert && uvAlertContent && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(480px, 92vw)',
          background: '#fff', borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.20)',
          border: `2px solid ${uvAlertContent.borderColor}`,
          padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: uvAlertContent.iconBg,
              border: `1.5px solid ${uvAlertContent.borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', flexShrink: 0,
            }}>{uvAlertContent.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#1c1917', lineHeight: 1.3, margin: 0 }}>
                {uvAlertContent.heading}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', margin: 0 }}>
                Current UV Index:{' '}
                <strong style={{ color: getUVTheme(data.uvIndex).color }}>
                  {Math.round(data.uvIndex)} — {getUVTheme(data.uvIndex).label}
                </strong>
              </p>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: '#44403c', lineHeight: 1.65, margin: 0 }}>
            {uvAlertContent.body}
          </p>
          <button
            onClick={() => setShowUVAlert(false)}
            style={{
              background: `linear-gradient(135deg, ${uvAlertContent.borderColor}, ${uvAlertContent.borderColor}cc)`,
              color: '#fff', border: 'none', borderRadius: '12px',
              padding: '11px', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer', width: '100%',
              boxShadow: `0 4px 12px ${uvAlertContent.borderColor}55`,
            }}
          >✓ Got it</button>
        </div>
      )}

      {/* Overdue reapply banner */}
      {showBanner && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(480px, 92vw)',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '2px solid #f97316', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🧴</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#1c1917' }}>Time to reapply sunscreen!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>It's been 2 hours. Protect your skin now.</p>
            </div>
          </div>
          <button onClick={handleDone} style={{
            background: 'linear-gradient(135deg, #f97316, #c2410c)',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', width: '100%'
          }}>✓ Done — I've reapplied</button>
        </div>
      )}

      {/* Done success popup */}
      {showDonePopup && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(480px, 92vw)',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '2px solid #f97316', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#1c1917' }}>Great job!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', marginBottom: 0, lineHeight: 1.5 }}>
                You've reapplied your sunscreen.
                <br />Here are a few simple sun-safe tips to keep in mind:
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {UNIVERSAL_TIPS.map((tip, i) => (
              <div key={i} style={{
                background: '#fff7ed', border: '1px solid #fed7aa',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '13px', color: '#9a3412', lineHeight: 1.45
              }}>• {tip}</div>
            ))}
          </div>
          <button onClick={() => setShowDonePopup(false)} style={{
            background: 'linear-gradient(135deg, #f97316, #c2410c)',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', width: '100%'
          }}>Got it</button>
        </div>
      )}

      {/* Hero video background */}
      <div style={{
        position: 'relative', height: '200px',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}>
        <video
          key={videoSrc}
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            zIndex: 0, pointerEvents: 'none',
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: theme.overlayColor, pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '80px', zIndex: 2,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.25))',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          padding: '24px 24px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '6px' }}>
              {dateStr} · {timeStr}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <h1 style={{
                color: '#fff', fontSize: 'clamp(28px, 6vw, 44px)',
                fontWeight: 700, lineHeight: 1.1,
                fontFamily: 'Georgia, serif', margin: 0,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                {data.cityName}
              </h1>
              <span style={{
                fontSize: '56px', lineHeight: 1,
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
                marginTop: '-4px',
              }}>
                {weather.icon}
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'space-between', flexWrap: 'wrap',
              gap: '12px', marginTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: 'clamp(32px, 6vw, 48px)',
                  fontWeight: 300, lineHeight: 1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  {data.temperature}°
                </span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', paddingBottom: '4px' }}>
                  {weather.desc}
                </span>
              </div>
              {data.uvIndex > 3 && (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '10px', padding: '6px 14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '13px' }}>⚠️</span>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    UV Protection Recommended
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card section */}
      <div style={{
        maxWidth: '680px', margin: '16px auto 0',
        padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>

        {/* UV Index card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <Label>☀ UV INDEX</Label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '52px', fontWeight: 700, color: theme.color, lineHeight: 1 }}>
                  {uvDisplay}
                </span>
                <span style={{
                  fontSize: '13px', fontWeight: 600,
                  padding: '3px 12px', borderRadius: '20px',
                  color: '#fff', background: theme.color,
                }}>{theme.label}</span>
              </div>
            </div>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: `2px solid ${theme.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', background: '#fff'
            }}>☀️</div>
          </div>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ background: '#e5e7eb', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                width: uvBarW, height: '100%', borderRadius: '99px',
                background: getBarGradient(data.uvIndex),
                transition: 'width 0.5s ease'
              }} />
            </div>
            {[3/11, 6/11, 8/11, 10/11].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0,
                left: `${pct * 100}%`, width: '1px', height: '10px',
                background: 'rgba(255,255,255,0.6)'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '14px' }}>
            <span style={{ color: '#4eb400', fontWeight: 600 }}>Low</span>
            <span style={{ color: '#f8b600', fontWeight: 600 }}>Moderate</span>
            <span style={{ color: '#f85900', fontWeight: 600 }}>High</span>
            <span style={{ color: '#d8001d', fontWeight: 600 }}>V.High</span>
            <span style={{ color: '#b54cff', fontWeight: 600 }}>Extreme</span>
          </div>

          {/* UV level inline tip — SPF values read from data.spf to stay consistent */}
          {(() => {
            const uvi = data.uvIndex
            const spf = data.spf
            if (uvi <= 2) return (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#166534' }}>
                ✅ <strong>Safe now.</strong> UV is low — no sunscreen needed for short outdoor stays. Enjoy the outdoors!
              </div>
            )
            if (uvi > 2 && uvi <= 5) return (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#92400e' }}>
                🧴 <strong>Apply SPF {spf}+.</strong> UV is moderate — wear sunscreen and a hat if you're heading out for more than 20 minutes.
              </div>
            )
            if (uvi > 5 && uvi <= 7) return (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ <strong>Protection essential.</strong> UV is high — apply SPF {spf}+, seek shade between 10am–4pm, and wear a hat and sunglasses.
              </div>
            )
            if (uvi > 7 && uvi <= 10) return (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
                🚨 <strong>High risk.</strong> UV is very high — minimise outdoor exposure, apply SPF {spf}+, and cover up with clothing and a hat.
              </div>
            )
            return (
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#7e22ce' }}>
                ☠️ <strong>Extreme UV.</strong> Avoid being outdoors if possible. If unavoidable, apply SPF {spf}+, wear full-coverage clothing, hat, and sunglasses.
              </div>
            )
          })()}
        </Card>

        {/* Reapply Reminder card */}
        <Card>
          <Label>⏱ REAPPLY REMINDER</Label>
          {lastApplied ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 10px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Last applied</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#1c1917' }}>{elapsedMin} min ago</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Reapply in</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: isOverdue ? '#dc2626' : '#f97316' }}>
                    {isOverdue ? 'Now!' : `${reapplyIn} min`}
                  </p>
                </div>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress * 100}%`, height: '100%', borderRadius: '99px',
                  background: isOverdue ? '#dc2626' : almostTime ? '#f97316' : '#fcd34d',
                  transition: 'width 1s linear'
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {isOverdue ? '🔴 Overdue — please reapply now!'
                    : almostTime ? '⚠️ Almost time to reapply'
                    : 'SPF 30+ recommended every 2 hours outdoors'}
                </p>
                <button onClick={handleDone} style={{
                  background: 'linear-gradient(135deg, #f97316, #c2410c)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '8px 18px', fontWeight: 600, fontSize: '13px',
                  cursor: 'pointer', flexShrink: 0, marginLeft: '12px'
                }}>Done ✓</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                Tap <strong>Done</strong> after applying sunscreen to start your 2-hour reminder
              </p>
              <button onClick={handleDone} style={{
                background: 'linear-gradient(135deg, #f97316, #c2410c)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '12px 32px', fontWeight: 600, fontSize: '15px',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.35)'
              }}>Just Applied Sunscreen ✓</button>
            </div>
          )}
        </Card>

        {/* SPF + Safe Sun Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Card>
            <Label>🧴 SPF</Label>
            {spfDisplay ? (
              <>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#4eb400', margin: '6px 0 2px', lineHeight: 1 }}>
                  No Need
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', fontWeight: 500, marginBottom: '6px' }}>UV level is safe</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>No sunscreen required at this UV level.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '40px', fontWeight: 700, color: '#f97316', margin: '6px 0 2px', lineHeight: 1 }}>
                  {data.spf}+
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', fontWeight: 500, marginBottom: '6px' }}>Recommended</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>{data.spfSuggestion}</p>
              </>
            )}
          </Card>
          <Card>
            <Label>🛡 SAFE SUN TIME</Label>
              {Math.round(data.uvIndex) === 0 ? (
            <>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#4eb400', margin: '6px 0 4px', lineHeight: 1 }}>
               Safe ✓
            </p>
            <p style={{ fontSize: '11px', color: '#4eb400', marginTop: '6px', lineHeight: 1.4, fontWeight: 500 }}>
               UV is zero — you're free to enjoy the outdoors!
            </p>
            </>
            ) : (
            <>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '6px 0 2px' }}>Less than</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>
              {formatTime(data.safeSunTime)}
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', lineHeight: 1.4 }}>
              {spfDisplay ? 'No sunscreen applied' : `Assumes SPF ${data.spf}+ applied and reapplied every two hours`}
            </p>
            </>
              )}
          </Card>
        </div>

      </div>
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '20px',
      padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid #f3f4f6'
    }}>{children}</div>
  )
}

function Label({ children }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </p>
  )
}