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
      width: '100%',
      background: '#f9fafb',
      borderTop: '2px solid #e5e7eb',
      padding: '28px 24px 36px',
      marginTop: '8px',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>

        {/* Copyright */}
        <p style={{
          fontSize: '12px',
          color: '#78716c',
          margin: '0 0 20px',
          lineHeight: 1.6,
        }}>
          © 2025 Monash University FIT5120 Team TE01. All rights reserved.
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '20px' }} />

        {/* Reference items — centered */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {REFERENCES.map((ref, i) => (
            <div key={i}>
              <p style={{
                fontSize: '11px',
                color: '#78716c',
                lineHeight: 1.7,
                margin: '0 0 4px',
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
                  lineHeight: 1.6,
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

      </div>
    </footer>
  )
}