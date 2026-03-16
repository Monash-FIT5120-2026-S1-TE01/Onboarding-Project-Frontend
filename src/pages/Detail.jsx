import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

// ── City whitelist ────────────────────────────────────────────
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

const CACHE_KEY = 'sunsense_uv_cache_detail'
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
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // ignore cache errors
  }
}

function getTimezone(cityName) {
  const found = SUPPORTED_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase())
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

// ── UV theme ──────────────────────────────────────────────────
function getUVTheme(uvi) {
  if (uvi <= 2)  return { label: 'Low',       color: '#4eb400', heroGrad: 'linear-gradient(135deg, #1f3a08 0%, #2f5f13 45%, #4eb400 100%)',      adviceBg: '#f0fdf4', adviceBorder: '#bbf7d0', adviceText: '#166534' }
  if (uvi <= 5)  return { label: 'Moderate',  color: '#f8b600', heroGrad: 'linear-gradient(135deg, #2f3f9e 0%, #5b3b92 48%, #a61d6b 100%)',      adviceBg: '#fff7ed', adviceBorder: '#fed7aa', adviceText: '#9a3412' }
  if (uvi <= 7)  return { label: 'High',      color: '#f88700', heroGrad: 'linear-gradient(135deg, #381700 0%, #8b3a09 48%, #f88700 100%)',      adviceBg: '#fff7ed', adviceBorder: '#fdba74', adviceText: '#9a3412' }
  if (uvi <= 10) return { label: 'Very High', color: '#e82c0e', heroGrad: 'linear-gradient(135deg, #3b0202 0%, #7f1d1d 48%, #e82c0e 100%)',      adviceBg: '#fef2f2', adviceBorder: '#fecaca', adviceText: '#991b1b' }
  return               { label: 'Extreme',   color: '#b54cff', heroGrad: 'linear-gradient(135deg, #2f0a47 0%, #6b21a8 48%, #b54cff 100%)',      adviceBg: '#faf5ff', adviceBorder: '#e9d5ff', adviceText: '#7e22ce' }
}

// ── UV progress bar gradient (WHO 11-color, same as Home) ─────
const UV_BAR_STOPS = ['#4eb400','#a0ce00','#f7e400','#f8b600','#f88700','#f85900','#e82c0e','#d8001d','#ff0099','#b54cff','#998cff']
function getBarGradient(uvi) {
  const stopCount = Math.max(2, Math.ceil(Math.min(1, uvi / 11) * UV_BAR_STOPS.length))
  return `linear-gradient(90deg, ${UV_BAR_STOPS.slice(0, stopCount).join(', ')})`
}

// ── Time formatters ───────────────────────────────────────────
function formatHeroDateLabel() {
  const date = new Date()
  const datePart = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timePart = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  return `${datePart} · ${timePart}`
}

function formatHourLabel(isoString) {
  return new Date(isoString).toLocaleTimeString('en-AU', { hour: 'numeric', hour12: true }).replace(':00', '')
}

function formatClockTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Build UV trend from past / current / forecast ─────────────
function buildTrendData(res) {
  const map = new Map()
  const pastUV = res?.past_uv_index_time?.uv_index ?? []
  const pastDT = res?.past_uv_index_time?.datetime ?? []
  pastDT.forEach((iso, i) => map.set(iso, { iso, time: formatHourLabel(iso), value: Number(pastUV[i] ?? 0) }))

  const currentIso = res?.current_uv_index_time?.datetime
  const currentUV  = Number(res?.current_uv_index_time?.uv_index ?? 0)
  if (currentIso) map.set(currentIso, { iso: currentIso, time: formatHourLabel(currentIso), value: currentUV })

  const forecastUV = res?.forecast_uv_index_time?.uv_index ?? []
  const forecastDT = res?.forecast_uv_index_time?.datetime ?? []
  forecastDT.forEach((iso, i) => map.set(iso, { iso, time: formatHourLabel(iso), value: Number(forecastUV[i] ?? 0) }))

  return Array.from(map.values()).sort((a, b) => new Date(a.iso) - new Date(b.iso))
}

function getPeakAndLowest(uvTrend) {
  if (!uvTrend.length) return { peakUV: 0, peakTime: '--', lowestUV: 0, lowestTime: '--' }
  let peak = uvTrend[0], lowest = uvTrend[0]
  uvTrend.forEach(item => {
    if (item.value > peak.value) peak = item
    if (item.value < lowest.value) lowest = item
  })
  return { peakUV: Math.round(peak.value), peakTime: peak.time, lowestUV: Math.round(lowest.value), lowestTime: lowest.time }
}

function buildNowSummary(currentUV, uvTrend) {
  if (!uvTrend.length) return 'UV data is currently unavailable.'
  const mod = uvTrend.filter(i => i.value >= 3)
  if (!mod.length) return 'UV is currently low. Protection is generally not required right now.'
  const label = getUVTheme(currentUV).label.toLowerCase()
  return `UV is currently ${label}. Levels of Moderate or higher are expected from ${mod[0].time} to ${mod[mod.length - 1].time} today.`
}

// ── Protection advice (3 cases: 0 / 30 / 50) ─────────────────
function buildProtectionAdvice(spf, usage) {
  if (!spf || spf === 0) {
    return {
      spfCase: 'none',
      title: 'No Sunscreen Needed',
      description: 'UV levels are currently low — sun protection is not required at this time. That said, it\'s always good to stay mindful of your skin health.',
      tips: [
        '🌿 Seek shade during midday hours, even when UV is low.',
        '💧 Stay well-hydrated throughout the day — sun and heat can dehydrate you quickly.',
        '🧴 Keep your face moisturised, especially in dry or windy conditions.',
        '🕶️ Wearing sunglasses can protect your eyes from UV exposure year-round.',
        '👒 A wide-brim hat is a simple and effective daily habit for sun safety.',
      ],
      recommendedAmount: [],
    }
  }

  const faceNeckTsp = usage?.face_neck?.teaspon ?? '~1'
  const armLegTsp   = usage?.arm_leg?.teaspon   ?? '~2'
  const totalMl     = usage?.total?.ml           ?? '~30'

  if (spf >= 50) {
    return {
      spfCase: '50',
      title: 'SPF 50+ Recommended',
      description: `UV levels are high. Use a broad-spectrum SPF 50+ sunscreen for maximum protection. Apply generously 20 minutes before going outdoors and reapply every 2 hours, or immediately after swimming or sweating. SPF 50+ significantly reduces your risk of sunburn and long-term skin damage.`,
      recommendedAmount: [
        `Face & neck: ${faceNeckTsp} teaspoon`,
        `Arms & legs: ${armLegTsp} teaspoons`,
        `Whole body: ${totalMl} mL total`,
      ],
    }
  }

  return {
    spfCase: '30',
    title: 'SPF 30+ Recommended',
    description: `Use a broad-spectrum SPF 30+ sunscreen. Apply 20 minutes before outdoor exposure and reapply every 2 hours, or after swimming or sweating. SPF 30 blocks approximately 97% of UVB rays and is suitable for most everyday outdoor activities.`,
    recommendedAmount: [
      `Face & neck: ${faceNeckTsp} teaspoon`,
      `Arms & legs: ${armLegTsp} teaspoons`,
      `Whole body: ${totalMl} mL total`,
    ],
  }
}

// ── Outfit advice ─────────────────────────────────────────────
function buildOutfitAdvice(suggCloth, weatherLabel, temperature, currentUV) {
  const noSuggestion = !suggCloth || suggCloth.trim() === '' || suggCloth.trim().toLowerCase() === 'no suggestion.'
  let description = noSuggestion ? '' : suggCloth
  if (noSuggestion) {
    if (currentUV >= 6)                                    description = 'UV levels are high today. Lightweight long sleeves, sunglasses, and a wide-brim hat are recommended for better protection outdoors.'
    else if (temperature >= 26)                            description = 'It is warm outside. Choose breathable clothing and bring sunglasses and a hat for additional sun protection.'
    else if (weatherLabel.toLowerCase().includes('cloudy')) description = 'It may look cloudy, but UV can still affect exposed skin. Light layers and a hat are a good choice.'
    else                                                    description = 'Dress comfortably for today\'s conditions, and consider sunglasses or a hat during outdoor exposure.'
  }
  const tags = []
  if (temperature >= 26)                               tags.push('#WarmWeather')
  if (currentUV >= 3)                                  tags.push('#SunSmart')
  if (weatherLabel.toLowerCase().includes('cloudy'))   tags.push('#CloudyDay')
  if (tags.length === 0)                               tags.push('#DailyComfort')
  return { title: 'Sun-Smart Casual', tags, description }
}

// ── Map API response → page data ──────────────────────────────
function mapResponse(res, cityName) {
  const uvTrend      = buildTrendData(res)
  const currentUV    = Number(res?.current_uv_index_time?.uv_index ?? 0)
  const currentISO   = res?.current_uv_index_time?.datetime ?? null
  const weatherLabel = parseWeatherLabel(res?.weather_label)
  const temperature  = Number(res?.temperature ?? 0)
  const spf          = Number(res?.spf ?? 0)
  const usage        = res?.usage ?? null
  const { peakUV, peakTime, lowestUV, lowestTime } = getPeakAndLowest(uvTrend)

  return {
    cityName: cityName || 'Melbourne',
    dateLabel: formatHeroDateLabel(),
    currentUV, uvLabel: getUVTheme(currentUV).label,
    peakUV, peakTime, lowestUV, lowestTime,
    currentTimeLabel: currentISO ? formatClockTime(currentISO) : '--:--',
    nowSummary:       buildNowSummary(currentUV, uvTrend),
    protectionAdvice: buildProtectionAdvice(spf, usage),
    outfitAdvice:     buildOutfitAdvice(res?.sugg_cloth, weatherLabel, temperature, currentUV),
    uvTrend, weatherLabel, temperature, spf,
  }
}

// ── Chart geometry ────────────────────────────────────────────
const CHART_W = 920, CHART_H = 360, CHART_PAD = { top: 18, right: 18, bottom: 28, left: 18 }

function buildChartGeometry(data) {
  const safeData = data.length > 1 ? data : [{ time: '12 AM', value: 0, iso: 'f1' }, { time: '1 AM', value: 0, iso: 'f2' }]
  const innerW = CHART_W - CHART_PAD.left - CHART_PAD.right
  const innerH = CHART_H - CHART_PAD.top  - CHART_PAD.bottom
  const points = safeData.map((item, i) => ({
    ...item,
    x: CHART_PAD.left + (i / (safeData.length - 1)) * innerW,
    y: CHART_PAD.top  + innerH - (item.value / 12) * innerH,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = [`M ${points[0].x} ${CHART_H - CHART_PAD.bottom}`, ...points.map(p => `L ${p.x} ${p.y}`), `L ${points[points.length - 1].x} ${CHART_H - CHART_PAD.bottom}`, 'Z'].join(' ')
  return { points, linePath, areaPath }
}

// ── Interactive UV Chart ──────────────────────────────────────
function UVChart({ chart, nowPoint }) {
  const svgRef   = useRef(null)
  const [hover, setHover] = useState(null) // { x, y, value, time }

  const getHoverFromEvent = useCallback((e) => {
    const svg  = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const svgX = ((clientX - rect.left) / rect.width) * CHART_W

    if (svgX < CHART_PAD.left || svgX > CHART_W - CHART_PAD.right) {
      setHover(null)
      return
    }

    // Find closest point
    let closest = chart.points[0]
    let minDist = Infinity
    chart.points.forEach(p => {
      const d = Math.abs(p.x - svgX)
      if (d < minDist) { minDist = d; closest = p }
    })
    setHover({ x: closest.x, y: closest.y, value: Math.round(closest.value), time: closest.time })
  }, [chart.points])

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        style={{ display: 'block', cursor: 'crosshair' }}
        aria-label="UV trend chart"
        onMouseMove={getHoverFromEvent}
        onMouseLeave={() => setHover(null)}
        onTouchMove={getHoverFromEvent}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="uvAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f8b600" stopOpacity="0.35" />
            <stop offset="45%"  stopColor="#84cc16" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1"  />
          </linearGradient>
          <linearGradient id="uvLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#4eb400" />
            <stop offset="45%"  stopColor="#f8b600" />
            <stop offset="75%"  stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#84cc16" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 2, 4, 6, 8, 10, 12].map(tick => {
          const y = CHART_PAD.top + (CHART_H - CHART_PAD.top - CHART_PAD.bottom) - (tick / 12) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom)
          return (
            <g key={tick}>
              <line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={CHART_W - 6} y={y + 4} textAnchor="end" fill="#a1a1aa" fontSize="11">{tick}</text>
            </g>
          )
        })}

        {/* Level labels */}
        {[{ label: 'Extreme', value: 11 }, { label: 'Very high', value: 8 }, { label: 'High', value: 6 }, { label: 'Moderate', value: 3 }, { label: 'Low', value: 1 }].map(item => {
          const y = CHART_PAD.top + (CHART_H - CHART_PAD.top - CHART_PAD.bottom) - (item.value / 12) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom)
          return <text key={item.label} x={CHART_PAD.left + 6} y={y - 6} fill="#a1a1aa" fontSize="10">{item.label}</text>
        })}

        {/* Vertical dividers */}
        {[0.25, 0.5, 0.75].map((pct, i) => {
          const x = CHART_PAD.left + (CHART_W - CHART_PAD.left - CHART_PAD.right) * pct
          return <line key={i} x1={x} x2={x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        })}

        <path d={chart.areaPath} fill="url(#uvAreaGradient)" />
        <path d={chart.linePath} fill="none" stroke="url(#uvLineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current time indicator (hidden when hovering) */}
        {!hover && (
          <>
            <line x1={nowPoint.x} x2={nowPoint.x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
            <circle cx={nowPoint.x} cy={nowPoint.y} r="7" fill="#1f2937" stroke="#facc15" strokeWidth="3" />
          </>
        )}

        {/* Hover indicator */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx={hover.x} cy={hover.y} r="7" fill="#1f2937" stroke="#ffffff" strokeWidth="3" />
          </>
        )}

        {/* X-axis labels */}
        {chart.points
          .filter((_, i) => {
            if (chart.points.length <= 5) return true
            const step = Math.floor((chart.points.length - 1) / 4)
            return i === 0 || i === chart.points.length - 1 || i % step === 0
          })
          .slice(0, 5)
          .map((p, i) => (
            <text key={i} x={p.x} y={348} textAnchor="middle" fill="#a1a1aa" fontSize="11">{p.time}</text>
          ))}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,30,40,0.92)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{hover.time}</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: getUVTheme(hover.value).color }}>UV {hover.value}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{getUVTheme(hover.value).label}</span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Detail() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const cityId   = localStorage.getItem('sunsense_selected_city') ?? 'melbourne'
    const stored   = localStorage.getItem('sunsense_cities')
    const cities   = stored ? JSON.parse(stored) : []
    const city     = cities.find(c => c.id === cityId)
    const cityName = city?.name ?? 'Melbourne'
    const timezone = city?.timezone ?? getTimezone(cityName)

    const cached = getCached(cityId)
    if (cached && cached.cityName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: cityName.toLowerCase(), timezone, sun_screen_efficiency: 0.8, skin_type: 3 }),
    })
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(res => {
        const mapped = mapResponse(res, cityName)
        setCached(cityId, mapped)
        setData(mapped)
        setLoading(false)
      })
      .catch(() => {
        setError('Unable to load detail data. Please check your connection.')
        setLoading(false)
      })
  }, [])

  const chart = useMemo(() => buildChartGeometry(data?.uvTrend ?? []), [data?.uvTrend])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>☀️</p>
        <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading detail data...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</p>
        <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.6 }}>{error ?? 'Unable to load page data.'}</p>
      </div>
    </div>
  )

  const theme   = getUVTheme(data.currentUV)
  const weather = getWeatherInfo(data.weatherLabel)
  const uvDisplay = Math.round(data.currentUV)
  const uvBarW    = `${Math.min(100, (data.currentUV / 11) * 100)}%`

  const nowIdx   = data.uvTrend.findIndex(item => item.iso && formatClockTime(item.iso) === data.currentTimeLabel)
  const nowPoint = chart.points[nowIdx >= 0 ? nowIdx : Math.max(0, chart.points.length - 2)] ?? chart.points[0]

  const { protectionAdvice: pa } = data

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '96px' }}>

      {/* Hero */}
      <div style={{ background: theme.heroGrad, padding: '38px 24px 54px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 72%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '8%', top: '22px', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.28)', boxShadow: '38px 14px 0 rgba(255,255,255,0.14), 82px 38px 0 rgba(255,255,255,0.12)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '920px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '13px', marginBottom: '10px' }}>{data.dateLabel}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ color: '#fff', fontSize: 'clamp(34px, 6vw, 52px)', fontWeight: 700, lineHeight: 1.1, fontFamily: 'Georgia, serif', margin: 0 }}>{data.cityName}</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)', backdropFilter: 'blur(8px)', fontSize: '22px' }}>{weather.icon}</span>
          </div>

          <div className="detail-hero-grid" style={{ marginTop: '22px', display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: '28px', alignItems: 'center' }}>
            {/* UV summary card */}
            <div style={{ borderRadius: '28px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '22px 22px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', maxWidth: '320px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>✷ UV Index</p>
              <span style={{ fontSize: '64px', fontWeight: 300, color: '#fff', lineHeight: 1 }}>{uvDisplay}</span>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{data.uvLabel}</p>
                {data.spf > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    SPF {data.spf}+ helpful
                  </span>
                )}
              </div>

              {/* UV progress bar — same style as Home, no text labels */}
              <div style={{ marginTop: '18px', position: 'relative' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: uvBarW, height: '100%', borderRadius: '99px', background: getBarGradient(data.currentUV), transition: 'width 0.5s ease' }} />
                </div>
                {[3/11, 6/11, 8/11, 10/11].map((pct, i) => (
                  <div key={i} style={{ position: 'absolute', top: 0, left: `${pct * 100}%`, width: '1px', height: '8px', background: 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>

            </div>

            {/* Right description */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{data.currentUV > 3 ? 'Sun protection recommended' : 'UV levels currently low'}</span>
              </div>
              <div style={{ height: '22px' }} />
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', lineHeight: 1.8, maxWidth: '500px' }}>
                Explore today's UV pattern, skin protection advice, and outfit suggestions designed for current conditions.
              </div>
              <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <InfoChip icon="🔺" text={`Peak ${data.peakUV} at ${data.peakTime}`} />
                <InfoChip icon="🌅" text={`Lowest ${data.lowestUV} at ${data.lowestTime}`} />
                <InfoChip icon="🌡️" text={`${data.temperature}° · ${weather.desc}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: '920px', margin: '18px auto 0', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Today's UV Trend */}
        <Card>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1c1917', lineHeight: 1.2, marginBottom: '6px' }}>Today's UV Trend</h2>
            <p style={{ fontSize: '16px', color: '#57534e', lineHeight: 1.5 }}>
              Peak UV: <strong>{data.peakUV}</strong> ({data.peakTime}) | Lowest: <strong>{data.lowestUV}</strong> ({data.lowestTime})
            </p>
          </div>

          <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'linear-gradient(180deg, #23252d 0%, #2c2f37 100%)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)', border: '1px solid #3f3f46' }}>
            <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[0,1,2].map(i => <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#71717a' }} />)}
            </div>
            <div style={{ padding: '8px 12px 10px' }}>
              <UVChart chart={chart} nowPoint={nowPoint} />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#1c1917', marginBottom: '4px' }}>Now, {data.currentTimeLabel}</p>
            <p style={{ fontSize: '16px', color: '#44403c', lineHeight: 1.7 }}>{data.nowSummary}</p>
          </div>
        </Card>

        {/* Protection Advice */}
        <Card>
          <SectionTitle icon="🛡️" title="Protection Advice" />
          <div style={{ marginTop: '14px', borderRadius: '20px', background: theme.adviceBg, border: `1px solid ${theme.adviceBorder}`, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: theme.adviceText, margin: 0 }}>{pa.title}</h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: theme.adviceText, background: 'rgba(255,255,255,0.45)', padding: '5px 10px', borderRadius: '999px' }}>
                {pa.spfCase === 'none' ? '✓ No action needed' : '☀ Daily protection'}
              </span>
            </div>

            <p style={{ fontSize: '16px', color: theme.adviceText, lineHeight: 1.7, marginBottom: pa.spfCase === 'none' ? '16px' : '18px' }}>
              {pa.description}
            </p>

            {/* Case: no need — show safety tips */}
            {pa.spfCase === 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pa.tips.map((tip, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.5)', border: `1px solid ${theme.adviceBorder}`, borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: theme.adviceText, lineHeight: 1.5 }}>
                    {tip}
                  </div>
                ))}
              </div>
            )}

            {/* Case: 30+ or 50+ — show recommended amounts */}
            {pa.spfCase !== 'none' && pa.recommendedAmount.length > 0 && (
              <div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: theme.adviceText, marginBottom: '8px' }}>Recommended amount</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: theme.adviceText }}>
                  {pa.recommendedAmount.map((item, i) => (
                    <li key={i} style={{ fontSize: '15px', lineHeight: 1.8 }}>{item}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '11px', color: theme.adviceText, opacity: 0.6, marginTop: '14px', lineHeight: 1.5 }}>
                  * Sunscreen amounts are estimated based on the Mosteller formula and CtrlCalculator reference values. Individual needs may vary.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Suggested Outfit */}
        <Card>
          <SectionTitle icon="👕" title="Suggested Outfit" />
          <div style={{ marginTop: '14px', borderRadius: '20px', background: '#fff1f2', border: '1px solid #fecdd3', padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#9f1239', margin: 0 }}>{data.outfitAdvice.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {data.outfitAdvice.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', padding: '4px 10px', borderRadius: '999px' }}>{tag}</span>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '16px', color: '#881337', lineHeight: 1.75 }}>{data.outfitAdvice.description}</p>
          </div>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#78716c', lineHeight: 1.7, padding: '10px 12px 24px', marginBottom: '18px' }}>
          This app's outfit and sun protection suggestions are based on the World Health Organization (WHO) Ultraviolet Index (UVI).
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .detail-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Card({ children }) {
  return <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>{children}</div>
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</span>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1c1917', lineHeight: 1.2, margin: 0 }}>{title}</h2>
    </div>
  )
}

function InfoChip({ icon, text }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', padding: '6px 10px', borderRadius: '999px' }}>
      <span>{icon}</span><span>{text}</span>
    </span>
  )
}