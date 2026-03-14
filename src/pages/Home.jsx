import { useState, useEffect, useCallback, useRef } from 'react'

// ── Mock 数据（Commit 4 替换为真实 API）──────────────────────
const MOCK_DATA = {
  cityName: 'Melbourne',
  temperature: 28,
  weatherCode: 1,
  uvIndex: 4.45,
  safeSunTime: 80,
  spf: 30,
  spfSuggestion: 'Broad-spectrum sunscreen is preferred.',
}

// ── UV 配色（WHO/WMO 标准）────────────────────────────────────
function getUVTheme(uvi) {
  if (uvi <= 2) return {
    label: 'Low',
    color: '#4eb400',
    heroGrad: 'linear-gradient(135deg, #1a3a00 0%, #2d6b00 40%, #4eb400 100%)',
    barColors: ['#4eb400'],
    textColor: '#fff',
  }
  if (uvi <= 5) return {
    label: 'Moderate',
    color: '#f7e400',
    heroGrad: 'linear-gradient(135deg, #3a2e00 0%, #7a5c00 40%, #f8b600 100%)',
    barColors: ['#4eb400', '#a0ce00', '#f7e400', '#f8b600'],
    textColor: '#fff',
  }
  if (uvi <= 7) return {
    label: 'High',
    color: '#f88700',
    heroGrad: 'linear-gradient(135deg, #3a1500 0%, #8a3500 40%, #f88700 100%)',
    barColors: ['#4eb400', '#f7e400', '#f88700', '#f85900'],
    textColor: '#fff',
  }
  if (uvi <= 10) return {
    label: 'Very High',
    color: '#e82c0e',
    heroGrad: 'linear-gradient(135deg, #2a0000 0%, #7a0a00 40%, #e82c0e 100%)',
    barColors: ['#4eb400', '#f7e400', '#f85900', '#e82c0e', '#d8001d'],
    textColor: '#fff',
  }
  return {
    label: 'Extreme',
    color: '#b54cff',
    heroGrad: 'linear-gradient(135deg, #1a0030 0%, #5a0090 40%, #b54cff 100%)',
    barColors: ['#4eb400', '#f7e400', '#f85900', '#d8001d', '#ff0099', '#b54cff'],
    textColor: '#fff',
  }
}

// UV 进度条：分段渐变（WHO 11色标准）
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

function getWeatherInfo(code) {
  if (code === 0)                          return { icon: '☀️', desc: 'Clear sky' }
  if ([1, 2, 3].includes(code))            return { icon: '⛅', desc: 'Partly cloudy' }
  if ([45, 48].includes(code))             return { icon: '🌫️', desc: 'Foggy' }
  if ([51,53,55,56,57].includes(code))     return { icon: '🌦️', desc: 'Drizzle' }
  if ([61,63,65,66,67].includes(code))     return { icon: '🌧️', desc: 'Rain' }
  if ([71,73,75,77].includes(code))        return { icon: '❄️', desc: 'Snow' }
  if ([80,81,82].includes(code))           return { icon: '🌩️', desc: 'Showers' }
  if ([95,96,99].includes(code))           return { icon: '⛈️', desc: 'Thunderstorm' }
  return { icon: '🌤️', desc: 'Unknown' }
}

function formatTime(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const REAPPLY_MS = 120 * 60 * 1000
{/* const REAPPLY_MS = 10 * 1000 */}

const UNIVERSAL_TIPS = [
  'Seek shade whenever possible, especially around midday.',
  'Check the UV Index regularly, even on cloudy days.',
]

// ── 主组件 ────────────────────────────────────────────────────
export default function Home() {
  const [data] = useState(MOCK_DATA)
  const [now, setNow] = useState(new Date())
  const [lastApplied, setLastApplied] = useState(() => {
    const s = localStorage.getItem('sunsense_last_applied')
    return s ? parseInt(s) : null
  })
  const [showBanner, setShowBanner] = useState(false)
  const [showDonePopup, setShowDonePopup] = useState(false)
  const notifiedRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 倒计时结束提醒
  useEffect(() => {
    if (!lastApplied) return
    const elapsed = Date.now() - lastApplied
    if (elapsed >= REAPPLY_MS && !notifiedRef.current) {
      notifiedRef.current = true
      setShowBanner(true)
      // 浏览器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SunSense ☀️', {
          body: "Time to reapply your sunscreen! SPF 30+ recommended.",
          icon: '/favicon.svg'
        })
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('SunSense ☀️', {
              body: "Time to reapply your sunscreen! SPF 30+ recommended.",
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

  const elapsed    = lastApplied ? Date.now() - lastApplied : null
  const elapsedMin = elapsed ? Math.floor(elapsed / 60000) : null
  const reapplyIn  = elapsed ? Math.max(0, Math.floor((REAPPLY_MS - elapsed) / 60000)) : null
  const progress   = elapsed ? Math.min(1, elapsed / REAPPLY_MS) : 0
  const isOverdue  = elapsed && elapsed >= REAPPLY_MS
  const almostTime = elapsed && elapsed >= REAPPLY_MS * 0.75

  const theme   = getUVTheme(data.uvIndex)
  const weather = getWeatherInfo(data.weatherCode)
  const uvBarW  = `${Math.min(100, (data.uvIndex / 11) * 100)}%`

  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const hasModal = showBanner || showDonePopup

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '40px', position: 'relative' }}>
      
      {hasModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 998,
          backdropFilter: 'blur(2px)'
        }} />
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* ── 逾期弹窗 banner ─────────────────────────────── */}
      {showBanner && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(480px, 92vw)',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '2px solid #f97316',
          padding: '20px 24px',
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
      
      {/* ── Done 成功提示弹窗 ─────────────────────────── */}
      {showDonePopup && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(480px, 92vw)',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '2px solid #f97316',
          padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#1c1917' }}>Great job!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', marginBottom: 0, lineHeight: 1.5 }}>
                You've reapplied your sunscreen.
                <br />
                Here are a few simple sun-safe tips to keep in mind:
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {UNIVERSAL_TIPS.map((tip, i) => (
              <div key={i} style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#9a3412',
                lineHeight: 1.45
              }}>
                • {tip}
              </div>
            ))}
          </div>

          <button onClick={() => setShowDonePopup(false)} style={{
            background: 'linear-gradient(135deg, #f97316, #c2410c)',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', width: '100%'
          }}>
            Got it
          </button>
        </div>
      )}

      {/* ── Hero（颜色跟随 UV）───────────────────────────── */}
      <div style={{
        background: theme.heroGrad,
        padding: '28px 24px 40px',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* 光晕装饰 */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.color}55 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* 日期时间 */}
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '4px' }}>
            {dateStr} · {timeStr}
          </p>

          {/* 城市名 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 style={{
              color: '#fff', fontSize: 'clamp(28px, 6vw, 44px)',
              fontWeight: 700, lineHeight: 1.1,
              fontFamily: 'Georgia, serif', margin: 0
            }}>
              {data.cityName}
            </h1>

            {/* 右：天气大图标 + UV警告徽章 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transform: 'translateY(-6px)' }}>
              <span style={{ fontSize: '64px', lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.22))' }}>
                {weather.icon}
              </span>
            </div>
          </div>

          {/* 主体行：左边温度，右边天气图标+UV警告 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            {/* 左：温度 + 天气描述 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(36px,7vw,52px)', fontWeight: 300, lineHeight: 1 }}>
                {data.temperature}°
              </span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '16px', paddingBottom: '4px' }}>
                {weather.desc}
              </span>
            </div>

            {/* 右：天气大图标 + UV警告徽章 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {data.uvIndex > 3 && (
                <div style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  display: 'flex', alignItems: 'center', gap: '6px'
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

      {/* ── 卡片区域（上移覆盖 Hero 底部）─────────────────── */}
      <div style={{
        maxWidth: '680px', margin: '16px auto 0',
        padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>

        {/* UV Index 卡片 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <Label>☀ UV INDEX</Label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '52px', fontWeight: 700, color: theme.color, lineHeight: 1 }}>
                  {data.uvIndex.toFixed(1)}
                </span>
                <span style={{
                  fontSize: '13px', fontWeight: 600,
                  padding: '3px 12px', borderRadius: '20px',
                  color: '#fff',
                  background: theme.color,
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

          {/* 分段进度条 */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{ background: '#e5e7eb', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                width: uvBarW, height: '100%', borderRadius: '99px',
                background: getBarGradient(data.uvIndex),
                transition: 'width 0.5s ease'
              }} />
            </div>
            {/* 刻度线 */}
            {[3/11, 6/11, 8/11, 10/11].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute', top: 0,
                left: `${pct * 100}%`, width: '1px', height: '10px',
                background: 'rgba(255,255,255,0.6)'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginBottom: '14px' }}>
            <span style={{ color: '#4eb400', fontWeight: 600 }}>Low</span>
            <span style={{ color: '#f8b600', fontWeight: 600 }}>Moderate</span>
            <span style={{ color: '#f85900', fontWeight: 600 }}>High</span>
            <span style={{ color: '#d8001d', fontWeight: 600 }}>V.High</span>
            <span style={{ color: '#b54cff', fontWeight: 600 }}>Extreme</span>
          </div>

          {data.uvIndex > 3 && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', color: '#92400e'
            }}>
              <strong>Sun protection is recommended.</strong> Use sunscreen and seek shade during extended outdoor time.
            </div>
          )}
        </Card>

        {/* Reapply Reminder 卡片 */}
        <Card>
          <Label>⏱ REAPPLY REMINDER</Label>

          {lastApplied ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 10px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Last applied</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#1c1917' }}>
                    {elapsedMin} min ago
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Reapply in</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: isOverdue ? '#dc2626' : '#f97316' }}>
                    {isOverdue ? 'Now!' : `${reapplyIn} min`}
                  </p>
                </div>
              </div>

              {/* 进度条 */}
              <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress * 100}%`, height: '100%', borderRadius: '99px',
                  background: isOverdue ? '#dc2626' : almostTime ? '#f97316' : '#fcd34d',
                  transition: 'width 1s linear'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {isOverdue
                    ? '🔴 Overdue — please reapply now!'
                    : almostTime
                      ? '⚠️ Almost time to reapply'
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
            <p style={{ fontSize: '40px', fontWeight: 700, color: '#f97316', margin: '6px 0 2px', lineHeight: 1 }}>
              {data.spf}+
            </p>
            <p style={{ fontSize: '12px', color: '#78716c', fontWeight: 500, marginBottom: '6px' }}>Recommended</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>{data.spfSuggestion}</p>
          </Card>

          <Card>
            <Label>🛡 SAFE SUN TIME</Label>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '6px 0 2px' }}>Less than</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>
              {formatTime(data.safeSunTime)}
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', lineHeight: 1.4 }}>
              Assumes SPF {data.spf} applied
            </p>
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