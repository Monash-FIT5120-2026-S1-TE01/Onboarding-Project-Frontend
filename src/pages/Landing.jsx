import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Landing() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setLoaded(true) }, [])

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100vh',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(to bottom, #1a0500 0%, #7c2d0a 25%, #c2410c 45%, #f97316 65%, #fdba74 82%, #fef3c7 100%)'
    }}>
      {/* 光晕叠加 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(255,180,60,0.35) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      {/* 顶部 Logo */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', paddingTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fcd34d, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', boxShadow: '0 4px 12px rgba(249,115,22,0.5)'
          }}>☀</div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' }}>
            Sun<span style={{ color: '#fcd34d' }}>Guard</span>
          </span>
        </div>
      </div>

      {/* 中央内容 */}
      <div style={{
        position: 'relative', zIndex: 10, flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px',
        opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.9s ease, transform 0.9s ease'
      }}>
        {/* 主标题 */}
        <h1 style={{ fontSize: 'clamp(56px, 10vw, 96px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '16px', fontFamily: 'Georgia, serif' }}>
          <span style={{ color: '#ffffff' }}>Sun</span>
          <span style={{ color: '#fcd34d' }}>Guard</span>
        </h1>

        {/* 副标题 */}
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 300, letterSpacing: '0.05em', marginBottom: '12px' }}>
          Your daily UV protection companion
        </p>

        {/* 分隔线 + slogan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{ width: '48px', height: '1px', background: 'rgba(255,255,255,0.3)' }} />
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.08em' }}>
            Stay aware, Stay protected, smarter sun protection starts here!
          </p>
          <div style={{ width: '48px', height: '1px', background: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* CTA 按钮 */}
        <button
          onClick={() => navigate('/home')}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 32px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff', fontWeight: 600, fontSize: '16px',
            cursor: 'pointer', transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
          <span>Check UV Now</span>
          <span>→</span>
        </button>
      </div>

      {/* 底部导航 */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'center', gap: '48px', paddingBottom: '32px'
      }}>
        {[
          { to: '/home',   icon: '🏠', label: 'Home'   },
          { to: '/cities', icon: '🌏', label: 'Cities' },
          { to: '/detail', icon: '📊', label: 'Detail' },
        ].map(item => (
          <a key={item.to} href={item.to} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: 'rgba(0,0,0,0.45)', fontSize: '11px', textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.85)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.45)'}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}