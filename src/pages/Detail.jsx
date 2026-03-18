import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

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
  // eslint-disable-next-line no-unused-vars, no-empty
  } catch (err) {}
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
  if (l.includes('clear'))        return { icon: '☀️',  desc: 'Clear sky'    }
  if (l.includes('cloudy'))       return { icon: '⛅',  desc: 'Partly cloudy'}
  if (l.includes('fog'))          return { icon: '🌫️', desc: 'Foggy'        }
  if (l.includes('drizzle'))      return { icon: '🌦️', desc: 'Drizzle'      }
  if (l.includes('rain'))         return { icon: '🌧️', desc: 'Rain'         }
  if (l.includes('snow'))         return { icon: '❄️',  desc: 'Snow'         }
  if (l.includes('thunderstorm')) return { icon: '⛈️', desc: 'Thunderstorm' }
  return { icon: '🌤️', desc: 'Unknown' }
}

function getUVTheme(uvi) {
  if (uvi <= 2)  return { label: 'Low',       color: '#4eb400', heroGrad: 'linear-gradient(135deg, #1f3a08 0%, #2f5f13 45%, #4eb400 100%)',  adviceBg: '#f0fdf4', adviceBorder: '#bbf7d0', adviceText: '#166534' }
  if (uvi <= 5)  return { label: 'Moderate',  color: '#f8b600', heroGrad: 'linear-gradient(135deg, #2f3f9e 0%, #5b3b92 48%, #a61d6b 100%)',  adviceBg: '#fff7ed', adviceBorder: '#fed7aa', adviceText: '#9a3412' }
  if (uvi <= 7)  return { label: 'High',      color: '#f88700', heroGrad: 'linear-gradient(135deg, #381700 0%, #8b3a09 48%, #f88700 100%)',  adviceBg: '#fff7ed', adviceBorder: '#fdba74', adviceText: '#9a3412' }
  if (uvi <= 10) return { label: 'Very High', color: '#e82c0e', heroGrad: 'linear-gradient(135deg, #3b0202 0%, #7f1d1d 48%, #e82c0e 100%)',  adviceBg: '#fef2f2', adviceBorder: '#fecaca', adviceText: '#991b1b' }
  return               { label: 'Extreme',   color: '#b54cff', heroGrad: 'linear-gradient(135deg, #2f0a47 0%, #6b21a8 48%, #b54cff 100%)',  adviceBg: '#faf5ff', adviceBorder: '#e9d5ff', adviceText: '#7e22ce' }
}

const UV_BAR_STOPS = ['#4eb400','#a0ce00','#f7e400','#f8b600','#f88700','#f85900','#e82c0e','#d8001d','#ff0099','#b54cff','#998cff']
function getBarGradient(uvi) {
  const stopCount = Math.max(2, Math.ceil(Math.min(1, uvi / 11) * UV_BAR_STOPS.length))
  return `linear-gradient(90deg, ${UV_BAR_STOPS.slice(0, stopCount).join(', ')})`
}

function isoToLocalHour(iso) { return parseInt(iso.slice(11, 13), 10) }
function hourToLabel(hour) {
  if (hour === 0)  return '12 am'
  if (hour === 12) return '12 pm'
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`
}

function getCityCurrentHour(timezone) {
  try {
    const str = new Date().toLocaleString('en-AU', { timeZone: timezone, hour: 'numeric', hour12: false })
    const h = parseInt(str, 10); return h === 24 ? 0 : h
  } catch { return new Date().getHours() }
}

function getCityTodayDate(timezone) {
  try {
    const parts = new Date().toLocaleDateString('en-AU', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).split('/')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  } catch { return new Date().toISOString().slice(0, 10) }
}

function buildTrendData(res, cityTimezone) {
  const todayDate = getCityTodayDate(cityTimezone)
  const map = new Map()
  function addPoint(iso, value) {
    if (!iso || iso.slice(0, 10) !== todayDate) return
    const hour = isoToLocalHour(iso)
    if (!map.has(hour) || iso === res?.current_uv_index_time?.datetime) {
      map.set(hour, { iso, hour, time: hourToLabel(hour), value: Number(value ?? 0) })
    }
  }
  const pastUV = res?.past_uv_index_time?.uv_index ?? []
  const pastDT = res?.past_uv_index_time?.datetime ?? []
  pastDT.forEach((iso, i) => addPoint(iso, pastUV[i]))
  const currentIso = res?.current_uv_index_time?.datetime
  const currentUV  = res?.current_uv_index_time?.uv_index
  if (currentIso) addPoint(currentIso, currentUV)
  const forecastUV = res?.forecast_uv_index_time?.uv_index ?? []
  const forecastDT = res?.forecast_uv_index_time?.datetime ?? []
  forecastDT.forEach((iso, i) => addPoint(iso, forecastUV[i]))
  return Array.from(map.values()).sort((a, b) => a.hour - b.hour)
}

function getPeakAndLowest(uvTrend) {
  if (!uvTrend.length) return { peakUV: 0, peakTime: '--', lowestUV: 0, lowestTime: '--' }
  let peak = uvTrend[0], lowest = uvTrend[0]
  uvTrend.forEach(item => { if (item.value > peak.value) peak = item; if (item.value < lowest.value) lowest = item })
  return { peakUV: Math.round(peak.value), peakTime: peak.time, lowestUV: Math.round(lowest.value), lowestTime: lowest.time }
}

function buildNowSummary(currentUV, uvTrend) {
  if (!uvTrend.length) return 'UV data is currently unavailable.'
  const mod = uvTrend.filter(i => i.value >= 3)
  if (!mod.length) return 'UV is currently low. Protection is generally not required right now.'
  const label = getUVTheme(currentUV).label.toLowerCase()
  return `UV is currently ${label}. Levels of Moderate or higher are expected from ${mod[0].time} to ${mod[mod.length - 1].time} today.`
}

function buildProtectionAdvice(spf, usage) {
  if (!spf || spf === 0) {
    return {
      spfCase: 'none', title: 'No Sunscreen Needed',
      description: "UV levels are currently low — sun protection is not required at this time.",
      tips: ['🌿 Seek shade during midday hours, even when UV is low.', '💧 Stay well-hydrated throughout the day.', '🧴 Keep your face moisturised, especially in dry or windy conditions.', '🕶️ Wearing sunglasses can protect your eyes from UV exposure year-round.', '👒 A wide-brim hat is a simple and effective daily habit.'],
      recommendedAmount: [],
    }
  }
  const faceNeckTsp = usage?.face_neck?.teaspoon ?? '~1'
  const armLegTsp   = usage?.arm_leg?.teaspoon   ?? '~2'
  const totalMl     = usage?.total?.ml           ?? '~30'
  if (spf >= 50) return { spfCase: '50', title: 'SPF 50+ Recommended', description: 'UV levels are high. Use a broad-spectrum SPF 50+ sunscreen for maximum protection. Apply generously 20 minutes before going outdoors and reapply every 2 hours.', recommendedAmount: [`Face & neck: ${faceNeckTsp} teaspoon`, `Arms & legs: ${armLegTsp} teaspoons`, `Whole body: ${totalMl} mL total`] }
  return { spfCase: '30', title: 'SPF 30+ Recommended', description: 'Use a broad-spectrum SPF 30+ sunscreen. Apply 20 minutes before outdoor exposure and reapply every 2 hours. SPF 30 blocks approximately 97% of UVB rays.', recommendedAmount: [`Face & neck: ${faceNeckTsp} teaspoon`, `Arms & legs: ${armLegTsp} teaspoons`, `Whole body: ${totalMl} mL total`] }
}

function buildOutfitAdvice(suggCloth, weatherLabel, temperature, currentUV) {
  const noSuggestion = !suggCloth || suggCloth.trim() === '' || suggCloth.trim().toLowerCase() === 'no suggestion.'
  let description = noSuggestion ? '' : suggCloth
  if (noSuggestion) {
    if (currentUV >= 6)                                     description = 'UV levels are high today. Lightweight long sleeves, sunglasses, and a wide-brim hat are recommended.'
    else if (temperature >= 26)                             description = 'It is warm outside. Choose breathable clothing and bring sunglasses and a hat.'
    else if (weatherLabel.toLowerCase().includes('cloudy')) description = 'It may look cloudy, but UV can still affect exposed skin. Light layers and a hat are a good choice.'
    else                                                    description = "Dress comfortably for today's conditions, and consider sunglasses or a hat during outdoor exposure."
  }
  const tags = []
  if (temperature >= 26)                               tags.push('#WarmWeather')
  if (currentUV >= 3)                                  tags.push('#SunSmart')
  if (weatherLabel.toLowerCase().includes('cloudy'))   tags.push('#CloudyDay')
  if (tags.length === 0)                               tags.push('#DailyComfort')
  return { title: 'Sun-Smart Casual', tags, description }
}

function formatHeroDateLabel(cityTimezone) {
  const now = new Date()
  const datePart = now.toLocaleDateString('en-AU', { timeZone: cityTimezone, weekday: 'short', day: 'numeric', month: 'short' })
  const timePart = now.toLocaleTimeString('en-AU', { timeZone: cityTimezone, hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  return `${datePart} · ${timePart}`
}

function mapResponse(res, cityName, cityTimezone) {
  const uvTrend      = buildTrendData(res, cityTimezone)
  const currentUV    = Number(res?.current_uv_index_time?.uv_index ?? 0)
  const weatherLabel = parseWeatherLabel(res?.weather_label)
  const temperature  = Number(res?.temperature ?? 0)
  const spf          = Number(res?.spf ?? 0)
  const usage        = res?.usage ?? null
  const { peakUV, peakTime, lowestUV, lowestTime } = getPeakAndLowest(uvTrend)
  return {
    cityName: cityName || 'Melbourne', cityTimezone,
    dateLabel: formatHeroDateLabel(cityTimezone),
    currentUV, uvLabel: getUVTheme(currentUV).label,
    peakUV, peakTime, lowestUV, lowestTime,
    nowSummary:       buildNowSummary(currentUV, uvTrend),
    protectionAdvice: buildProtectionAdvice(spf, usage),
    outfitAdvice:     buildOutfitAdvice(res?.sugg_cloth, weatherLabel, temperature, currentUV),
    uvTrend, weatherLabel, temperature, spf,
  }
}

const CHART_W = 920, CHART_H = 340, CHART_PAD = { top: 18, right: 18, bottom: 28, left: 18 }

function buildChartGeometry(data) {
  const safeData = data.length > 1 ? data : [{ time: '12 am', value: 0, iso: 'f1', hour: 0 }, { time: '11 pm', value: 0, iso: 'f2', hour: 23 }]
  const innerW = CHART_W - CHART_PAD.left - CHART_PAD.right
  const innerH = CHART_H - CHART_PAD.top  - CHART_PAD.bottom
  const points = safeData.map((item, i) => ({ ...item, x: CHART_PAD.left + (i / (safeData.length - 1)) * innerW, y: CHART_PAD.top + innerH - (item.value / 12) * innerH }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = [`M ${points[0].x} ${CHART_H - CHART_PAD.bottom}`, ...points.map(p => `L ${p.x} ${p.y}`), `L ${points[points.length - 1].x} ${CHART_H - CHART_PAD.bottom}`, 'Z'].join(' ')
  return { points, linePath, areaPath }
}

function UVChart({ chart, nowPoint }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const getHoverFromEvent = useCallback((e) => {
    const svg = svgRef.current; if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const svgX = ((clientX - rect.left) / rect.width) * CHART_W
    if (svgX < CHART_PAD.left || svgX > CHART_W - CHART_PAD.right) { setHover(null); return }
    let closest = chart.points[0], minDist = Infinity
    chart.points.forEach(p => { const d = Math.abs(p.x - svgX); if (d < minDist) { minDist = d; closest = p } })
    setHover({ x: closest.x, y: closest.y, value: Math.round(closest.value), time: closest.time })
  }, [chart.points])

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" style={{ display: 'block', cursor: 'crosshair' }} aria-label="UV trend chart"
        onMouseMove={getHoverFromEvent} onMouseLeave={() => setHover(null)}
        onTouchMove={getHoverFromEvent} onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="uvAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f8b600" stopOpacity="0.35" />
            <stop offset="45%"  stopColor="#84cc16" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1"  />
          </linearGradient>
          <linearGradient id="uvLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#4eb400" />
            <stop offset="45%"  stopColor="#f8b600" />
            <stop offset="75%"  stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#84cc16" />
          </linearGradient>
        </defs>
        {[0, 2, 4, 6, 8, 10, 12].map(tick => {
          const y = CHART_PAD.top + (CHART_H - CHART_PAD.top - CHART_PAD.bottom) - (tick / 12) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom)
          return <g key={tick}><line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x={CHART_W - 6} y={y + 4} textAnchor="end" fill="#a1a1aa" fontSize="11">{tick}</text></g>
        })}
        {[{ label: 'Extreme', value: 11 }, { label: 'Very high', value: 8 }, { label: 'High', value: 6 }, { label: 'Moderate', value: 3 }, { label: 'Low', value: 1 }].map(item => {
          const y = CHART_PAD.top + (CHART_H - CHART_PAD.top - CHART_PAD.bottom) - (item.value / 12) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom)
          return <text key={item.label} x={CHART_PAD.left + 6} y={y - 6} fill="#a1a1aa" fontSize="10">{item.label}</text>
        })}
        {[0.25, 0.5, 0.75].map((pct, i) => { const x = CHART_PAD.left + (CHART_W - CHART_PAD.left - CHART_PAD.right) * pct; return <line key={i} x1={x} x2={x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.06)" strokeWidth="1" /> })}
        <path d={chart.areaPath} fill="url(#uvAreaGrad)" />
        <path d={chart.linePath} fill="none" stroke="url(#uvLineGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {!hover && (<><line x1={nowPoint.x} x2={nowPoint.x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.45)" strokeWidth="2" /><circle cx={nowPoint.x} cy={nowPoint.y} r="7" fill="#1f2937" stroke="#facc15" strokeWidth="3" /></>)}
        {hover && (<><line x1={hover.x} x2={hover.x} y1={CHART_PAD.top} y2={CHART_H - CHART_PAD.bottom} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" /><circle cx={hover.x} cy={hover.y} r="7" fill="#1f2937" stroke="#ffffff" strokeWidth="3" /></>)}
        {chart.points.filter((_, i) => { if (chart.points.length <= 5) return true; const step = Math.floor((chart.points.length - 1) / 4); return i === 0 || i === chart.points.length - 1 || i % step === 0 }).slice(0, 5).map((p, i) => (<text key={i} x={p.x} y={CHART_H - 4} textAnchor="middle" fill="#a1a1aa" fontSize="11">{p.time}</text>))}
      </svg>
      {hover && (
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,40,0.92)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{hover.time}</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: getUVTheme(hover.value).color }}>UV {hover.value}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{getUVTheme(hover.value).label}</span>
        </div>
      )}
    </div>
  )
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached && cached.cityName) { setData(cached); setLoading(false); return }

    setLoading(true); setError(null)
    fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: cityName.toLowerCase(), timezone, sun_screen_efficiency: 0.8, skin_type: 3 }),
    })
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(res => { const mapped = mapResponse(res, cityName, timezone); setCached(cityId, mapped); setData(mapped); setLoading(false) })
      .catch(() => { setError('Unable to load detail data. Please check your connection.'); setLoading(false) })
  }, [])

  const chart = useMemo(() => buildChartGeometry(data?.uvTrend ?? []), [data?.uvTrend])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #f3f4f6', borderTop: '3px solid #f97316', animation: 'sg-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>Loading UV detail...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
        <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.6 }}>{error ?? 'Unable to load page data.'}</p>
      </div>
    </div>
  )

  const theme     = getUVTheme(data.currentUV)
  const weather   = getWeatherInfo(data.weatherLabel)
  const uvDisplay = Math.round(data.currentUV)
  const uvBarW    = `${Math.min(100, (data.currentUV / 11) * 100)}%`

  const cityCurrentHour = getCityCurrentHour(data.cityTimezone)
  const realTimeStr = new Date().toLocaleTimeString('en-AU', { timeZone: data.cityTimezone, hour: '2-digit', minute: '2-digit' })

  const nowIdx = data.uvTrend.reduce((bestIdx, item, i) => {
    const diff = Math.abs(item.hour - cityCurrentHour)
    const bestDiff = bestIdx >= 0 ? Math.abs(data.uvTrend[bestIdx].hour - cityCurrentHour) : Infinity
    return diff < bestDiff ? i : bestIdx
  }, -1)

  const nowPoint = chart.points[nowIdx >= 0 ? nowIdx : Math.max(0, chart.points.length - 2)] ?? chart.points[0]
  const { protectionAdvice: pa } = data

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '60px' }}>
      <style>{`
        .detail-content-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 24px;
          align-items: start;
        }
        .detail-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (max-width: 960px) {
          .detail-content-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background: theme.heroGrad, padding: '44px 48px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 72%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '13px', marginBottom: '12px' }}>{data.dateLabel}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'center' }}>
            {/* UV summary card */}
            <div style={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '24px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px' }}>{weather.icon}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>UV Index</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{data.cityName} · {realTimeStr}</p>
                </div>
              </div>
              <span style={{ fontSize: '72px', fontWeight: 300, color: '#fff', lineHeight: 1 }}>{uvDisplay}</span>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0 }}>{data.uvLabel}</p>
                {data.spf > 0 && <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>SPF {data.spf}+</span>}
              </div>
              <div style={{ marginTop: '16px', position: 'relative' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: uvBarW, height: '100%', borderRadius: '99px', background: getBarGradient(data.currentUV), transition: 'width 0.5s ease' }} />
                </div>
                {[3/11, 6/11, 8/11, 10/11].map((pct, i) => (
                  <div key={i} style={{ position: 'absolute', top: 0, left: `${pct * 100}%`, width: '1px', height: '8px', background: 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>

            {/* Right: title + chips */}
            <div>
              <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, fontFamily: 'Georgia, serif', margin: '0 0 16px' }}>{data.cityName}</h1>
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '10px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{data.currentUV > 3 ? 'Sun protection recommended' : 'UV levels currently low'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <InfoChip icon="🔺" text={`Peak ${data.peakUV} at ${data.peakTime}`} />
                <InfoChip icon="🌅" text={`Lowest ${data.lowestUV} at ${data.lowestTime}`} />
                <InfoChip icon="🌡️" text={`${data.temperature}° · ${weather.desc}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div style={{ maxWidth: '1280px', margin: '28px auto', padding: '0 48px' }}>
        <div className="detail-content-grid">

          {/* LEFT: UV Trend chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
              <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', marginBottom: '4px' }}>Today's UV Trend</h2>
                <p style={{ fontSize: '14px', color: '#57534e' }}>Peak: <strong>{data.peakUV}</strong> ({data.peakTime}) · Lowest: <strong>{data.lowestUV}</strong> ({data.lowestTime})</p>
              </div>
              <div style={{ borderRadius: '14px', overflow: 'hidden', background: 'linear-gradient(180deg, #23252d 0%, #2c2f37 100%)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)', border: '1px solid #3f3f46' }}>
                <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#71717a' }} />)}
                </div>
                <div style={{ padding: '8px 12px 10px' }}>
                  <UVChart chart={chart} nowPoint={nowPoint} />
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#1c1917', marginBottom: '4px' }}>Now, {realTimeStr}</p>
                <p style={{ fontSize: '14px', color: '#44403c', lineHeight: 1.7 }}>{data.nowSummary}</p>
              </div>
            </Card>
          </div>

          {/* RIGHT: Protection + Outfit stacked */}
          <div className="detail-right-col">

            {/* Protection Advice */}
            <Card>
              <SectionTitle icon="🛡️" title="Protection Advice" />
              <div style={{ marginTop: '14px', borderRadius: '16px', background: theme.adviceBg, border: `1px solid ${theme.adviceBorder}`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: theme.adviceText, margin: 0 }}>{pa.title}</h3>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: theme.adviceText, background: 'rgba(255,255,255,0.45)', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {pa.spfCase === 'none' ? '✓ No action needed' : '☀ Daily protection'}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: theme.adviceText, lineHeight: 1.7, marginBottom: pa.spfCase === 'none' ? '14px' : '16px' }}>{pa.description}</p>
                {pa.spfCase === 'none' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {pa.tips.map((tip, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.5)', border: `1px solid ${theme.adviceBorder}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: theme.adviceText, lineHeight: 1.5 }}>{tip}</div>)}
                  </div>
                )}
                {pa.spfCase !== 'none' && pa.recommendedAmount.length > 0 && (
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: theme.adviceText, marginBottom: '8px' }}>Recommended amount</p>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: theme.adviceText }}>
                      {pa.recommendedAmount.map((item, i) => <li key={i} style={{ fontSize: '13px', lineHeight: 1.8 }}>{item}</li>)}
                    </ul>
                    <p style={{ fontSize: '11px', color: theme.adviceText, opacity: 0.6, marginTop: '12px', lineHeight: 1.5 }}>* Amounts are estimated based on the Mosteller formula.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Suggested Outfit */}
            <Card>
              <SectionTitle icon="👕" title="Suggested Outfit" />
              <div style={{ marginTop: '14px', borderRadius: '16px', background: '#fff1f2', border: '1px solid #fecdd3', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#9f1239', margin: 0 }}>{data.outfitAdvice.title}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {data.outfitAdvice.tags.map((tag, i) => <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', padding: '3px 9px', borderRadius: '999px' }}>{tag}</span>)}
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: '#881337', lineHeight: 1.75 }}>{data.outfitAdvice.description}</p>
              </div>
            </Card>

          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#78716c', lineHeight: 1.7, padding: '24px 12px 0' }}>
          Outfit and sun protection suggestions are based on the World Health Organization (WHO) Ultraviolet Index (UVI).
        </p>
      </div>
    </div>
  )
}

function Card({ children }) {
  return <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>{children}</div>
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1c1917', lineHeight: 1.2, margin: 0 }}>{title}</h2>
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