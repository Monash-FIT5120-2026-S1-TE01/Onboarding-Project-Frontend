import { useState, useEffect, useCallback, useRef } from 'react'
import Footer from '../components/Footer'

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
const CACHE_TTL = 60 * 60 * 1000
const alertedCities = new Set()

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
function getWeatherVideo(label) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('clear'))        return '/videos/Clear.mp4'
  if (l.includes('cloudy'))       return '/videos/Cloudy.mp4'
  if (l.includes('fog'))          return '/videos/Fog.mp4'
  if (l.includes('drizzle'))      return '/videos/Drizzle.mp4'
  if (l.includes('rain'))         return '/videos/Rain.mp4'
  if (l.includes('snow'))         return '/videos/Snow.mp4'
  if (l.includes('thunderstorm')) return '/videos/Thunderstorm.mp4'
  return '/videos/Clear.mp4'
}
function getUVTheme(uvi) {
  if (uvi <= 2)  return { label: 'Low',       color: '#4eb400', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', overlayColor: 'rgba(26,58,0,0.45)'  }
  if (uvi <= 5)  return { label: 'Moderate',  color: '#f8b600', bg: '#fffbeb', border: '#fde68a', text: '#92400e', overlayColor: 'rgba(58,46,0,0.45)'  }
  if (uvi <= 7)  return { label: 'High',      color: '#f88700', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', overlayColor: 'rgba(58,21,0,0.45)'  }
  if (uvi <= 10) return { label: 'Very High', color: '#e82c0e', bg: '#fef2f2', border: '#fecaca', text: '#991b1b', overlayColor: 'rgba(42,0,0,0.50)'   }
  return               { label: 'Extreme',   color: '#b54cff', bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', overlayColor: 'rgba(26,0,48,0.50)'  }
}
const UV_BAR_STOPS = ['#4eb400','#a0ce00','#f7e400','#f8b600','#f88700','#f85900','#e82c0e','#d8001d','#ff0099','#b54cff','#998cff']
function getBarGradient(uvi) {
  const stopCount = Math.max(2, Math.ceil(Math.min(1, uvi / 11) * UV_BAR_STOPS.length))
  return `linear-gradient(90deg, ${UV_BAR_STOPS.slice(0, stopCount).join(', ')})`
}
function getWeatherInfo(label) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('clear'))        return { icon: '☀️',  desc: 'Clear sky'    }
  if (l.includes('cloudy'))       return { icon: '⛅',  desc: 'Partly cloudy'}
  if (l.includes('fog'))          return { icon: '🌫️', desc: 'Foggy'        }
  if (l.includes('drizzle'))      return { icon: '🌦️', desc: 'Drizzle'      }
  if (l.includes('rain'))         return { icon: '🌧️', desc: 'Rain'         }
  if (l.includes('snow'))         return { icon: '❄️',  desc: 'Snow'         }
  if (l.includes('thunderstorm')) return { icon: '⛈️', desc: 'Thunderstorm' }
  return { icon: '🌤️', desc: 'Unknown' }
}
function formatTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 min'
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`
  if (totalMinutes / 60 >= 24) return '> 1 day'
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
const REAPPLY_MS = 120 * 60 * 1000
const UNIVERSAL_TIPS = [
  'Seek shade whenever possible, especially around midday.',
  'Check the UV Index regularly, even on cloudy days.',
]
function getCached(cityId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY); if (!raw) return null
    const cache = JSON.parse(raw); const entry = cache[cityId]
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null
    return entry.data
  } catch { return null }
}
function setCached(cityId, data) {
  try {
    const raw = localStorage.getItem(CACHE_KEY); const cache = raw ? JSON.parse(raw) : {}
    cache[cityId] = { ts: Date.now(), data }; localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  // eslint-disable-next-line no-empty
  } catch {}
}
function getUVAlertContent(uvi, spf) {
  if (uvi > 2 && uvi <= 5)  return { icon: '🧴', borderColor: '#fbbf24', iconBg: '#fef3c7', heading: 'Moderate UV — Take Care',            body: `UV levels are moderate. Apply SPF ${spf}+ sunscreen if heading outdoors for more than 20 minutes.` }
  if (uvi > 5 && uvi <= 7)  return { icon: '⚠️', borderColor: '#f97316', iconBg: '#fff7ed', heading: 'High UV — Protection Needed',         body: `UV is high. Apply SPF ${spf}+, seek shade between 10am–4pm, and wear a hat and sunglasses.` }
  if (uvi > 7 && uvi <= 10) return { icon: '🚨', borderColor: '#ef4444', iconBg: '#fef2f2', heading: 'Very High UV — Stay Protected',       body: `UV is very high. Minimise outdoor time, apply SPF ${spf}+, cover exposed skin and reapply every 2 hours.` }
  return                            { icon: '☠️', borderColor: '#a855f7', iconBg: '#faf5ff', heading: 'Extreme UV — Avoid Outdoor Exposure',  body: `UV is extreme. Stay indoors during peak hours. If outside, wear SPF ${spf}+, full coverage clothing, sunglasses and a hat.` }
}

export default function Home() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [now, setNow]         = useState(new Date())
  const [lastApplied, setLastApplied] = useState(() => { const s = localStorage.getItem('sunsense_last_applied'); return s ? parseInt(s) : null })
  const [showBanner, setShowBanner]       = useState(false)
  const [showDonePopup, setShowDonePopup] = useState(false)
  const notifiedRef = useRef(false)
  const [showUVAlert, setShowUVAlert] = useState(false)

  useEffect(() => {
    const cityId = localStorage.getItem('sunsense_selected_city') ?? 'melbourne'
    const stored = localStorage.getItem('sunsense_cities'); const cities = stored ? JSON.parse(stored) : []
    const city = cities.find(c => c.id === cityId); const cityName = city?.name ?? 'Melbourne'
    const timezone = city?.timezone ?? getTimezone(cityName)
    alertedCities.delete(cityId)
    function maybeShowUVAlert(uvIndex) {
      if ((uvIndex ?? 0) >= 3 && !alertedCities.has(cityId)) { alertedCities.add(cityId); setShowUVAlert(true) }
    }
    const cached = getCached(cityId)
    if (cached && cached.safeSunTime !== undefined && cached.cityName) { setData(cached); maybeShowUVAlert(cached.uvIndex); setLoading(false); return }
    setLoading(true); setError(null)
    fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city_name: cityName.toLowerCase(), timezone, sun_screen_efficiency: 0.3, skin_type: 3 })
    })
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(res => {
        const parsed = { cityName, temperature: res.temperature ?? 0, weatherLabel: parseWeatherLabel(res.weather_label), uvIndex: res.current_uv_index_time?.uv_index ?? 0, safeSunTime: res.safe_time ?? 0, spf: res.spf ?? 0, spfSuggestion: 'Broad-spectrum sunscreen is preferred.' }
        setCached(cityId, parsed); setData(parsed); maybeShowUVAlert(parsed.uvIndex); setLoading(false)
      })
      .catch(() => { setError('Unable to load UV data. Please check your connection.'); setLoading(false) })
  }, [])

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (!lastApplied) return
    const elapsed = Date.now() - lastApplied
    if (elapsed >= REAPPLY_MS && !notifiedRef.current) {
      notifiedRef.current = true; setShowBanner(true)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SunGuard ☀️', { body: 'Time to reapply your sunscreen!', icon: '/favicon.svg' })
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => { if (p === 'granted') new Notification('SunGuard ☀️', { body: 'Time to reapply your sunscreen!', icon: '/favicon.svg' }) })
      }
    }
  }, [now, lastApplied])

  const handleDone = useCallback(() => {
    const ts = Date.now(); setLastApplied(ts); localStorage.setItem('sunsense_last_applied', String(ts))
    setShowBanner(false); setShowDonePopup(true); notifiedRef.current = false
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTop: '3px solid #f97316', animation: 'sg-spin 0.8s linear infinite', margin: '0 auto 16px' }} /><p style={{ fontSize: '15px', color: '#9ca3af', fontWeight: 500 }}>Loading UV data...</p></div>
    </div>
  )
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <p style={{ fontSize: '15px', color: '#ef4444', textAlign: 'center', padding: '0 24px' }}>{error}</p>
    </div>
  )

  // eslint-disable-next-line react-hooks/purity
  const elapsed    = lastApplied ? Date.now() - lastApplied : null
  const elapsedMin = elapsed ? Math.floor(elapsed / 60000) : null
  const reapplyIn  = elapsed ? Math.max(0, Math.floor((REAPPLY_MS - elapsed) / 60000)) : null
  const progress   = elapsed ? Math.min(1, elapsed / REAPPLY_MS) : 0
  const isOverdue  = !!(elapsed && elapsed >= REAPPLY_MS)
  const almostTime = !!(elapsed && elapsed >= REAPPLY_MS * 0.75)
  const theme      = getUVTheme(data.uvIndex)
  const weather    = getWeatherInfo(data.weatherLabel)
  const videoSrc   = getWeatherVideo(data.weatherLabel)
  const uvBarW     = `${Math.min(100, (data.uvIndex / 11) * 100)}%`
  const uvDisplay  = Math.round(data.uvIndex)
  const dateStr    = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr    = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const hasModal   = showBanner || showDonePopup || showUVAlert
  const spfZero    = !data.spf || data.spf === 0
  const uvAlertContent = showUVAlert ? getUVAlertContent(data.uvIndex, data.spf) : null

  /* shared card style */
  const card = { background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '28px 32px' }
  const cardLabel = { fontSize: '12px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', position: 'relative' }}>
      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(249,115,22,0.55)} 70%{box-shadow:0 0 0 14px rgba(249,115,22,0)} 100%{box-shadow:0 0 0 0 rgba(249,115,22,0)} }
        @keyframes pulse-ring-red { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.6)} 70%{box-shadow:0 0 0 14px rgba(220,38,38,0)} 100%{box-shadow:0 0 0 0 rgba(220,38,38,0)} }
        @keyframes btn-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes sg-spin { to { transform: rotate(360deg); } }
        .hp-wrap { max-width:1400px; margin:0 auto; padding:0 24px 40px; }
        .hp-2col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
        .hp-3col { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media(max-width:900px){
          .hp-wrap{padding:0 14px 28px;}
          .hp-2col{grid-template-columns:1fr;}
          .hp-3col{grid-template-columns:1fr;}
        }
        @media(max-width:600px){ .hp-wrap{padding:0 10px 20px;} }
      `}</style>

      {hasModal && <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:998,backdropFilter:'blur(2px)' }} />}

      {showUVAlert && uvAlertContent && (
        <div style={{ position:'fixed',top:'80px',left:'50%',transform:'translateX(-50%)',zIndex:1000,width:'min(480px,92vw)',background:'#fff',borderRadius:'20px',boxShadow:'0 12px 40px rgba(0,0,0,0.20)',border:`2px solid ${uvAlertContent.borderColor}`,padding:'28px',display:'flex',flexDirection:'column',gap:'16px',animation:'slideDown 0.3s ease' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <div style={{ width:'54px',height:'54px',borderRadius:'50%',background:uvAlertContent.iconBg,border:`1.5px solid ${uvAlertContent.borderColor}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',flexShrink:0 }}>{uvAlertContent.icon}</div>
            <div>
              <p style={{ fontWeight:700,fontSize:'17px',color:'#1c1917',lineHeight:1.3,margin:0 }}>{uvAlertContent.heading}</p>
              <p style={{ fontSize:'13px',color:'#9ca3af',margin:'4px 0 0' }}>UV: <strong style={{ color:theme.color }}>{uvDisplay} — {theme.label}</strong></p>
            </div>
          </div>
          <p style={{ fontSize:'15px',color:'#44403c',lineHeight:1.65,margin:0 }}>{uvAlertContent.body}</p>
          <button onClick={() => setShowUVAlert(false)} style={{ background:`linear-gradient(135deg,${uvAlertContent.borderColor},${uvAlertContent.borderColor}cc)`,color:'#fff',border:'none',borderRadius:'12px',padding:'13px',fontWeight:600,fontSize:'15px',cursor:'pointer',width:'100%' }}>✓ Got it</button>
        </div>
      )}

      {showBanner && (
        <div style={{ position:'fixed',top:'80px',left:'50%',transform:'translateX(-50%)',zIndex:1000,width:'min(480px,92vw)',background:'#fff',borderRadius:'16px',boxShadow:'0 8px 32px rgba(0,0,0,0.18)',border:'2px solid #f97316',padding:'24px',display:'flex',flexDirection:'column',gap:'14px',animation:'slideDown 0.3s ease' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <span style={{ fontSize:'30px' }}>🧴</span>
            <div><p style={{ fontWeight:700,fontSize:'17px',color:'#1c1917',margin:0 }}>Time to reapply sunscreen!</p><p style={{ fontSize:'14px',color:'#6b7280',margin:'3px 0 0' }}>It's been 2 hours since last application.</p></div>
          </div>
          <button onClick={handleDone} style={{ background:'linear-gradient(135deg,#f97316,#c2410c)',color:'#fff',border:'none',borderRadius:'10px',padding:'13px',fontWeight:700,fontSize:'16px',cursor:'pointer',width:'100%' }}>✓ Done — I've reapplied</button>
        </div>
      )}

      {showDonePopup && (
        <div style={{ position:'fixed',top:'80px',left:'50%',transform:'translateX(-50%)',zIndex:1000,width:'min(480px,92vw)',background:'#fff',borderRadius:'16px',boxShadow:'0 8px 32px rgba(0,0,0,0.18)',border:'2px solid #f97316',padding:'24px',display:'flex',flexDirection:'column',gap:'14px',animation:'slideDown 0.3s ease' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <span style={{ fontSize:'30px' }}>✅</span>
            <div><p style={{ fontWeight:700,fontSize:'17px',color:'#1c1917',margin:0 }}>Great job!</p><p style={{ fontSize:'14px',color:'#6b7280',margin:'3px 0 0' }}>You've reapplied your sunscreen. Timer reset.</p></div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
            {UNIVERSAL_TIPS.map((tip,i) => <div key={i} style={{ background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',padding:'11px 14px',fontSize:'14px',color:'#9a3412',lineHeight:1.5 }}>• {tip}</div>)}
          </div>
          <button onClick={() => setShowDonePopup(false)} style={{ background:'linear-gradient(135deg,#f97316,#c2410c)',color:'#fff',border:'none',borderRadius:'10px',padding:'11px',fontWeight:600,fontSize:'15px',cursor:'pointer',width:'100%' }}>Got it</button>
        </div>
      )}

      {/* HERO */}
      <div style={{ position:'relative',height:'280px',overflow:'hidden',marginBottom:'24px' }}>
        <video key={videoSrc} autoPlay muted loop playsInline style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:0,pointerEvents:'none' }}>
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div style={{ position:'absolute',inset:0,zIndex:1,background:theme.overlayColor,pointerEvents:'none' }} />
        <div style={{ position:'absolute',inset:0,zIndex:3,display:'flex',alignItems:'center',padding:'0 clamp(16px,3vw,40px)' }}>
          <div style={{ maxWidth:'1400px',margin:'0 auto',width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div>
              <p style={{ color:'rgba(255,255,255,0.65)',fontSize:'14px',margin:'0 0 8px' }}>{dateStr} · {timeStr}</p>
              <h1 style={{ color:'#fff',fontSize:'clamp(32px,5vw,52px)',fontWeight:700,fontFamily:'Georgia,serif',margin:'0 0 10px',textShadow:'0 2px 8px rgba(0,0,0,0.3)',lineHeight:1.1 }}>{data.cityName}</h1>
              <div style={{ display:'flex',alignItems:'baseline',gap:'10px' }}>
                <span style={{ color:'rgba(255,255,255,0.95)',fontSize:'clamp(26px,4vw,40px)',fontWeight:300 }}>{data.temperature}°</span>
                <span style={{ color:'rgba(255,255,255,0.65)',fontSize:'15px' }}>{weather.desc}</span>
              </div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'10px' }}>
              <span style={{ fontSize:'clamp(44px,7vw,68px)',lineHeight:1,filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}>{weather.icon}</span>
              {data.uvIndex > 3 && (
                <div style={{ background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'10px',padding:'6px 14px',display:'flex',alignItems:'center',gap:'6px' }}>
                  <span style={{ fontSize:'13px' }}>⚠️</span><span style={{ color:'#fff',fontSize:'12px',fontWeight:600 }}>UV Protection Recommended</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="hp-wrap">

        {/* Row 1: UV Index + Reapply */}
        <div className="hp-2col">
          {/* UV Index */}
          <div style={card}>
            <p style={cardLabel}>☀ UV Index</p>
            <div style={{ display:'flex',alignItems:'baseline',gap:'14px',marginBottom:'18px' }}>
              <span style={{ fontSize:'72px',fontWeight:700,color:theme.color,lineHeight:1 }}>{uvDisplay}</span>
              <span style={{ fontSize:'16px',fontWeight:600,padding:'5px 16px',borderRadius:'20px',color:'#fff',background:theme.color }}>{theme.label}</span>
            </div>
            <div style={{ position:'relative',marginBottom:'8px' }}>
              <div style={{ background:'#e5e7eb',borderRadius:'99px',height:'10px',overflow:'hidden' }}>
                <div style={{ width:uvBarW,height:'100%',borderRadius:'99px',background:getBarGradient(data.uvIndex),transition:'width 0.5s ease' }} />
              </div>
              {[3/11,6/11,8/11,10/11].map((pct,i) => <div key={i} style={{ position:'absolute',top:0,left:`${pct*100}%`,width:'1px',height:'10px',background:'rgba(255,255,255,0.7)' }} />)}
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:'11px',marginBottom:'22px' }}>
              <span style={{ color:'#4eb400',fontWeight:600 }}>Low</span>
              <span style={{ color:'#f8b600',fontWeight:600 }}>Moderate</span>
              <span style={{ color:'#f85900',fontWeight:600 }}>High</span>
              <span style={{ color:'#d8001d',fontWeight:600 }}>V.High</span>
              <span style={{ color:'#b54cff',fontWeight:600 }}>Extreme</span>
            </div>
            {(() => {
              const uvi = data.uvIndex; const spf = data.spf
              const s = { borderRadius:'12px',padding:'13px 16px',fontSize:'14px',lineHeight:1.55 }
              if (uvi <= 2)  return <div style={{...s,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>✅ <strong>Safe now.</strong> UV is low — no sunscreen needed for short outdoor stays.</div>
              if (uvi <= 5)  return <div style={{...s,background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'}}>🧴 <strong>Apply SPF {spf}+.</strong> UV is moderate — sunscreen recommended for extended outdoor time.</div>
              if (uvi <= 7)  return <div style={{...s,background:'#fff7ed',border:'1px solid #fed7aa',color:'#92400e'}}>⚠️ <strong>Protection essential.</strong> UV is high — apply SPF {spf}+, seek shade between 10am–4pm.</div>
              if (uvi <= 10) return <div style={{...s,background:'#fef2f2',border:'1px solid #fecaca',color:'#991b1b'}}>🚨 <strong>High risk.</strong> UV is very high — minimise outdoor exposure, apply SPF {spf}+.</div>
              return <div style={{...s,background:'#faf5ff',border:'1px solid #e9d5ff',color:'#7e22ce'}}>☠️ <strong>Extreme UV.</strong> Avoid outdoors if possible. Apply SPF {spf}+, full coverage clothing.</div>
            })()}
          </div>

          {/* Reapply */}
          <div style={card}>
            <p style={cardLabel}>⏱ Reapply Reminder</p>
            {lastApplied ? (
              <>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'16px' }}>
                  <div>
                    <p style={{ fontSize:'13px',color:'#9ca3af',margin:'0 0 3px' }}>Last applied</p>
                    <p style={{ fontSize:'36px',fontWeight:700,color:'#1c1917',lineHeight:1 }}>{elapsedMin} <span style={{ fontSize:'16px',fontWeight:400,color:'#6b7280' }}>min ago</span></p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:'13px',color:'#9ca3af',margin:'0 0 3px' }}>Reapply in</p>
                    <p style={{ fontSize:'36px',fontWeight:700,color:isOverdue?'#dc2626':'#f97316',lineHeight:1 }}>{isOverdue?'Now!':reapplyIn+' min'}</p>
                  </div>
                </div>
                <div style={{ background:'#f3f4f6',borderRadius:'99px',height:'10px',marginBottom:'16px',overflow:'hidden' }}>
                  <div style={{ width:`${progress*100}%`,height:'100%',borderRadius:'99px',background:isOverdue?'#dc2626':almostTime?'#f97316':'#fcd34d',transition:'width 1s linear' }} />
                </div>
                {isOverdue && <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'10px',padding:'11px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px' }}><span>🚨</span><p style={{ fontSize:'14px',color:'#dc2626',fontWeight:600,margin:0 }}>Overdue — reapply sunscreen now!</p></div>}
                {!isOverdue && almostTime && <div style={{ background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',padding:'11px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px' }}><span>⚠️</span><p style={{ fontSize:'14px',color:'#92400e',fontWeight:600,margin:0 }}>Almost time — get your sunscreen ready</p></div>}
                {!isOverdue && !almostTime && <p style={{ fontSize:'13px',color:'#9ca3af',marginBottom:'16px',lineHeight:1.6 }}>Reapplying every 2 hours ensures continuous UV protection, especially during outdoor activities and sport.</p>}
                <button onClick={handleDone} style={{ width:'100%',padding:isOverdue?'17px':'15px',borderRadius:'12px',border:'none',background:isOverdue?'linear-gradient(135deg,#dc2626,#991b1b)':'linear-gradient(135deg,#f97316,#c2410c)',color:'#fff',fontSize:isOverdue?'17px':'16px',fontWeight:700,cursor:'pointer',animation:isOverdue?'pulse-ring-red 1.4s ease infinite,btn-shake 2.5s ease infinite':almostTime?'pulse-ring 1.8s ease infinite':'none',boxShadow:isOverdue?'0 6px 20px rgba(220,38,38,0.5)':'0 4px 16px rgba(249,115,22,0.4)',transition:'transform 0.1s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
                  {isOverdue?"🚨 Reapply Now — I've Done It":"✓ Done — I've Reapplied"}
                </button>
              </>
            ) : (
              <>
                <div style={{ background:'linear-gradient(135deg,#fff7ed,#ffedd5)',border:'1px solid #fed7aa',borderRadius:'12px',padding:'18px 20px',marginBottom:'22px',display:'flex',alignItems:'flex-start',gap:'14px' }}>
                  <span style={{ fontSize:'26px',flexShrink:0,marginTop:'2px' }}>🧴</span>
                  <div>
                    <p style={{ fontSize:'15px',fontWeight:700,color:'#9a3412',margin:'0 0 5px' }}>Applied sunscreen? Tap to start your reminder</p>
                    <p style={{ fontSize:'13px',color:'#b45309',margin:0,lineHeight:1.55 }}>SunGuard will alert you every 2 hours for maximum protection, no matter where you are.</p>
                  </div>
                </div>
                <button onClick={handleDone} style={{ width:'100%',padding:'18px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#f97316,#c2410c)',color:'#fff',fontSize:'17px',fontWeight:700,cursor:'pointer',boxShadow:'0 6px 24px rgba(249,115,22,0.50)',animation:'pulse-ring 1.8s ease infinite',transition:'transform 0.1s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
                  ☀️ I've Applied Sunscreen
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: SPF + Safe Sun */}
        <div className="hp-2col">
          <div style={card}>
            <p style={cardLabel}>🧴 SPF Recommendation</p>
            {spfZero ? (
              <>
                <p style={{ fontSize:'48px',fontWeight:700,color:'#4eb400',margin:'0 0 6px',lineHeight:1 }}>No Need</p>
                <p style={{ fontSize:'15px',color:'#78716c',margin:'0 0 10px' }}>UV level is currently safe</p>
                <p style={{ fontSize:'14px',color:'#9ca3af',lineHeight:1.6 }}>No sunscreen is required at this UV level. Still a good habit to apply moisturiser with light SPF for daily skin care.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize:'56px',fontWeight:700,color:'#f97316',margin:'0 0 6px',lineHeight:1 }}>{data.spf}+</p>
                <p style={{ fontSize:'15px',color:'#78716c',margin:'0 0 10px' }}>Recommended SPF</p>
                <p style={{ fontSize:'14px',color:'#9ca3af',lineHeight:1.6 }}>{data.spfSuggestion} Apply 20 minutes before sun exposure and reapply every 2 hours, or after swimming and sweating.</p>
              </>
            )}
          </div>

          <div style={card}>
            <p style={cardLabel}>🛡 Safe Sun Time</p>
            {Math.round(data.uvIndex) === 0 ? (
              <>
                <p style={{ fontSize:'48px',fontWeight:700,color:'#4eb400',margin:'0 0 6px',lineHeight:1 }}>Unlimited ✓</p>
                <p style={{ fontSize:'14px',color:'#4eb400',fontWeight:500,lineHeight:1.5,margin:'0 0 10px' }}>UV is zero — enjoy the outdoors safely!</p>
                <p style={{ fontSize:'14px',color:'#9ca3af',lineHeight:1.6 }}>Even when UV is zero, stay hydrated and wear sunglasses for eye protection on bright days.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize:'13px',color:'#9ca3af',margin:'0 0 4px' }}>Estimated safe exposure</p>
                <p style={{ fontSize:'52px',fontWeight:700,color:'#1c1917',margin:'0 0 6px',lineHeight:1 }}>{formatTime(data.safeSunTime)}</p>
                <p style={{ fontSize:'14px',color:'#9ca3af',lineHeight:1.6 }}>{spfZero?'No sunscreen applied — unprotected skin.':`Assumes SPF ${data.spf}+ applied and reapplied every two hours. Skin type and clothing also affect your actual safe time.`}</p>
              </>
            )}
          </div>
        </div>

        {/* Row 3: 3 Tip Cards */}
        <div className="hp-3col">
          {[
            { icon:'🧴', title:'Apply SPF 50+', desc:'Use broad-spectrum sunscreen 20 minutes before going outdoors. Reapply every 2 hours, and after swimming or sweating, to maintain consistent protection.' },
            { icon:'👒', title:'Cover Up',       desc:'Wear a broad-brim hat, UV-protective sunglasses, and lightweight long-sleeved clothing. UPF 50+ fabrics block over 98% of UV radiation reaching your skin.' },
            { icon:'🌳', title:'Seek Shade',     desc:'Stay under shade between 10am–4pm when UV peaks. Note that UV can still reach you indirectly from reflected surfaces like water, sand and concrete.' },
          ].map((tip,i) => (
            <div key={i} style={card}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px' }}>
                <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:'#fff7ed',border:'1px solid #fed7aa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0 }}>{tip.icon}</div>
                <p style={{ fontSize:'16px',fontWeight:700,color:'#1c1917',margin:0 }}>{tip.title}</p>
              </div>
              <p style={{ fontSize:'14px',color:'#6b7280',lineHeight:1.65,margin:0 }}>{tip.desc}</p>
            </div>
          ))}
        </div>

      </div>
      <Footer />
    </div>
  )
}