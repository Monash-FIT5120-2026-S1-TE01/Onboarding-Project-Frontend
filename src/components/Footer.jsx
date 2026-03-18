// src/components/Footer.jsx
// Shared footer used across Home, Cities, Detail pages

const REFERENCES = [
  {
    citation: 'World Health Organization. (2022). SunSmart global UV app helps protect you from the dangers of the sun and promotes public health.',
    url: 'https://www.who.int/zh/news/item/21-06-2022-sunsmart-global-uv-app-helps-protect-you-from-the-dangers-of-the-sun-and-promotes-public-health',
  },
  {
    citation: 'Australian Bureau of Meteorology. (n.d.). About the UV index. Bureau of Meteorology.',
    url: 'https://www.bom.gov.au/resources/learn-and-explore/uv-knowledge-centre/about-the-uv-index',
  },
]

export default function Footer() {
  return (
    <footer style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '28px 48px 40px',
      borderTop: '1px solid #e5e7eb',
    }}>

      {/* Copyright — centered, bold, black */}
      <p style={{
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 700,
        color: '#1c1917',
        margin: '0 0 20px',
        lineHeight: 1.6,
      }}>
        © 2025 Monash University FIT5120 Team TE01. All rights reserved.
      </p>

      {/* Divider */}
      <div style={{ height: '1px', background: '#f3f4f6', marginBottom: '16px' }} />

      {/* References label */}
      <p style={{
        fontSize: '10px',
        fontWeight: 700,
        color: '#9ca3af',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>
        References
      </p>

      {/* Reference list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {REFERENCES.map((ref, i) => (
          <div key={i}>
            <p style={{
              fontSize: '11px',
              color: '#78716c',
              lineHeight: 1.6,
              margin: '0 0 3px',
            }}>
              {ref.citation}
            </p>
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                textDecoration: 'none',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                display: 'block',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f97316' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
            >
              {ref.url}
            </a>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer { padding: 24px 20px 32px !important; }
        }
      `}</style>
    </footer>
  )
}