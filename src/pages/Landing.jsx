import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'

function NavLink({ to, label }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '2px',
        color: hovered ? '#ffffff' : 'rgb(53, 53, 53)',
        textAlign: 'center',
        padding: '15px 22px',
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        background: hovered ? 'rgba(255,255,255,0.25)' : 'transparent',
        textDecoration: 'none',
        display: 'block',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </a>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundImage: 'url(/images/bac_4.png)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: loaded ? '50% 14%' : 'top',
        transition: 'background-position 1.6s ease-out',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* 底部渐变遮罩 */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, right: 0, left: 0,
        background: 'linear-gradient(transparent 50%, rgb(0,0,0))',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* ── 顶部导航 zIndex=10 ── */}
      <header style={{
        position: 'absolute',
        top: 0,
        zIndex: 10,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'opacity 1.2s ease, transform 1.2s ease',
      }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 8px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          height: '54px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {[
            { to: '/home',   label: 'Home'      },
            { to: '/cities', label: 'Cities'    },
            { to: '/detail', label: 'UV Detail' },
          ].map(item => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>
      </header>

      {/* ── 标题区域 zIndex=3（在bac_3/bac_2之上，bac_2_2/bac_1之下）── */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 3,
        width: '100%',
        pointerEvents: 'none',
      }}>
        {/* 顶部 Logo */}
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: '8px', marginBottom: '20px',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(500px)',
            transition: 'opacity 1s ease, transform 1s ease',
        }}>
        <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fcd34d, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', boxShadow: '0 4px 20px rgba(249,115,22,0.6)'
        }}>☀</div>
        <span style={{
            color: 'rgba(255,255,255,0.9)', fontSize: '20px',
            fontWeight: 500, letterSpacing: '5px', textTransform: 'uppercase'
        }}>
            Sun<span style={{ color: '#fcd34d' }}>Guard</span>
        </span>
        </div>

        {/* 副标题 */}
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 400,
          letterSpacing: '15px',
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          textTransform: 'uppercase',
          margin: 0,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(500px)',
          transition: 'opacity 1s ease, transform 1s ease',
        }}>
          Your Daily UV Protection Companion
        </h3>

        {/* 主标题 */}
        <h1 style={{
          fontSize: '15rem',
          fontWeight: 800,
          letterSpacing: '20px',
          fontFamily: 'Georgia, serif',
          margin: '-20px 0',
          lineHeight: 1,
          textAlign: 'center',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(500px)',
          transition: 'opacity 1.2s ease 0.1s, transform 1.2s ease 0.1s',
        }}>
          <span style={{ color: '#ffffff' }}>Sun</span>
          <span style={{ color: '#fcd34d' }}>Guard</span>
        </h1>
      </div>

      {/* ── bac_3 中景 zIndex=1（标题之下）── */}
      <img
        src="/images/bac_3.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: '-12%',
          left: 0,
          width: '100%',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(200px)',
          transition: 'opacity 1.5s ease, transform 1.5s ease',
        }}
      />

      {/* ── bac_2 近景主树林 zIndex=2（标题之下）── */}
      <img
        src="/images/bac_2.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: '-12%',
          left: 0,
          width: '100%',
          zIndex: 2,
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(200px)',
          transition: 'opacity 1.1s ease, transform 1.1s ease',
        }}
      />

      {/* ── bac_2_2 zIndex=4（标题之上）── */}
      <img
        src="/images/bac_2_2.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: '-12%',
          left: 0,
          width: '100%',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(200px)',
          transition: 'opacity 1.3s ease, transform 1.3s ease',
        }}
      />

      {/* ── bac_1 最近景 zIndex=5（标题之上）── */}
      <img
        src="/images/bac_1.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: '-12%',
          left: 0,
          width: '100%',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(200px)',
          transition: 'opacity 1s ease, transform 1s ease',
        }}
      />

      {/* ── 描述文字 zIndex=6（所有图层之上）── */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        position: 'absolute',
        bottom: '18%',
        zIndex: 6,
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(500px)',
        transition: 'opacity 1.2s ease 0.2s, transform 1.2s ease 0.2s',
      }}>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          letterSpacing: '1px',
          lineHeight: 1.8,
          color: 'rgba(255,255,255,0.7)',
          width: '45%',
          textAlign: 'center',
          fontStyle: 'italic',
          textShadow: '0 1px 5px rgba(0,0,0,0.2)',
          margin: 0,
        }}>
          Powered by WHO UV Index standards and real-time Australian meteorological data —
          SunGuard helps you monitor, understand, and respond to UV radiation levels,
          so you and your family can stay sun-safe, every day, anywhere across Australia.
        </p>
      </div>

      {/* ── CTA 按钮 zIndex=6 ── */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        zIndex: 6,
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(500px)',
        transition: 'opacity 1.2s ease 0.3s, transform 1.2s ease 0.3s',
      }}>
        <button
          onClick={() => navigate('/home')}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            fontSize: '16px',
            fontWeight: 400,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: btnHovered ? 'rgb(53,53,53)' : 'rgba(255,255,255,0.8)',
            backgroundColor: btnHovered ? 'rgba(255,255,255,0.85)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.8)',
            borderRadius: '50px',
            height: '50px',
            width: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
        >
          <span>Check Now</span>
          <span style={{ fontSize: '18px' }}>→</span>
        </button>
      </div>

    </div>
  )
}