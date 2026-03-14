import { useMemo } from 'react'

// ── Mock 详情页数据（后期可替换为真实 API 返回）────────────────────────────
const MOCK_DETAIL_DATA = {
  cityName: 'Melbourne',
  dateLabel: 'Sun, 15 Mar · 01:54 am',

  // 当前 UV 核心数据
  currentUV: 4.0,
  uvLabel: 'Moderate',
  peakUV: 7,
  peakTime: '1 PM',
  lowestUV: 1,
  lowestTime: '7 AM',

  // 当前说明文案
  nowSummary:
    'Low for the rest of the day. Levels of Moderate or higher were reached from 10:00 to 18:00.',

  // 防晒建议模块
  protectionAdvice: {
    title: 'Sunscreen',
    description:
      'Use broad-spectrum SPF 30+ sunscreen. Apply 20 minutes before outdoor exposure and reapply every 2 hours.',
    recommendedAmount: [
      'Face & neck: ~1 teaspoon',
      'Arms and legs: apply generously',
      'Whole body: about 30–35 mL',
    ],
  },

  // 穿搭建议模块
  outfitAdvice: {
    title: 'Sun-Smart Casual',
    tags: ['#Casual', '#StayInShade'],
    description:
      "Light and comfortable for today. Short sleeves are okay, but light long sleeves and long pants offer better protection. A hat is recommended, and an umbrella can help if you'll be outdoors longer.",
  },

  // 图表数据（后期可替换为后端返回的逐小时 UV 数据）
  uvTrend: [
    { time: '6 AM', value: 0.5 },
    { time: '7 AM', value: 1 },
    { time: '8 AM', value: 2 },
    { time: '9 AM', value: 4 },
    { time: '10 AM', value: 5.5 },
    { time: '11 AM', value: 6.5 },
    { time: '12 PM', value: 7 },
    { time: '1 PM', value: 8 },
    { time: '2 PM', value: 8.2 },
    { time: '3 PM', value: 7.4 },
    { time: '4 PM', value: 6 },
    { time: '5 PM', value: 4 },
    { time: '6 PM', value: 1.5 },
    { time: '7 PM', value: 0.6 },
  ],
}

// ── UV 等级主题工具函数 ─────────────────────────────────────────────
function getUVTheme(uvi) {
  if (uvi <= 2) {
    return {
      label: 'Low',
      color: '#4eb400',
      heroGrad: 'linear-gradient(135deg, #1f3a08 0%, #2f5f13 45%, #4eb400 100%)',
      adviceBg: '#f0fdf4',
      adviceBorder: '#bbf7d0',
      adviceText: '#166534',
    }
  }

  if (uvi <= 5) {
    return {
      label: 'Moderate',
      color: '#f8b600',
      heroGrad: 'linear-gradient(135deg, #2f3f9e 0%, #5b3b92 48%, #a61d6b 100%)',
      adviceBg: '#fff7ed',
      adviceBorder: '#fed7aa',
      adviceText: '#9a3412',
    }
  }

  if (uvi <= 7) {
    return {
      label: 'High',
      color: '#f88700',
      heroGrad: 'linear-gradient(135deg, #381700 0%, #8b3a09 48%, #f88700 100%)',
      adviceBg: '#fff7ed',
      adviceBorder: '#fdba74',
      adviceText: '#9a3412',
    }
  }

  if (uvi <= 10) {
    return {
      label: 'Very High',
      color: '#e82c0e',
      heroGrad: 'linear-gradient(135deg, #3b0202 0%, #7f1d1d 48%, #e82c0e 100%)',
      adviceBg: '#fef2f2',
      adviceBorder: '#fecaca',
      adviceText: '#991b1b',
    }
  }

  return {
    label: 'Extreme',
    color: '#b54cff',
    heroGrad: 'linear-gradient(135deg, #2f0a47 0%, #6b21a8 48%, #b54cff 100%)',
    adviceBg: '#faf5ff',
    adviceBorder: '#e9d5ff',
    adviceText: '#7e22ce',
  }
}

// ── 构建 SVG 图表点位 ─────────────────────────────────────────────
function buildChartGeometry(data, width, height, maxY = 12) {
  const padding = { top: 18, right: 18, bottom: 28, left: 18 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1)) * innerW
    const y = padding.top + innerH - (item.value / maxY) * innerH
    return { ...item, x, y }
  })

  const linePath = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaPath = [
    `M ${points[0].x} ${height - padding.bottom}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height - padding.bottom}`,
    'Z',
  ].join(' ')

  return { padding, innerW, innerH, points, linePath, areaPath }
}

// ── 主组件 ───────────────────────────────────────────────────────
export default function Detail() {
  // 当前先直接使用 mock 数据，后期可替换为 API 返回
  const data = MOCK_DETAIL_DATA

  // 根据 UV 主题动态切换颜色
  const theme = getUVTheme(data.currentUV)

  // 图表几何数据
  const chart = useMemo(() => {
    return buildChartGeometry(data.uvTrend, 920, 360, 12)
  }, [data.uvTrend])

  // 当前时间高亮点
  const nowPoint = chart.points[11] ?? chart.points[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        paddingBottom: '96px',
      }}
    >
      {/* ── Hero 顶部主视觉区 ───────────────────────────── */}
      <div
        style={{
          background: theme.heroGrad,
          padding: '38px 24px 54px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 柔和光晕装饰 */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 72%)',
            pointerEvents: 'none',
          }}
        />

        {/* 左上小装饰点 */}
        <div
          style={{
            position: 'absolute',
            left: '8%',
            top: '22px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.28)',
            boxShadow: '38px 14px 0 rgba(255,255,255,0.14), 82px 38px 0 rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 日期 */}
          <p
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: '13px',
              marginBottom: '10px',
              letterSpacing: '0.02em',
            }}
          >
            {data.dateLabel}
          </p>

          {/* 城市标题 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '6px',
            }}
          >
            <h1
              style={{
                color: '#fff',
                fontSize: 'clamp(34px, 6vw, 52px)',
                fontWeight: 700,
                lineHeight: 1.1,
                fontFamily: 'Georgia, serif',
                margin: 0,
              }}
            >
              {data.cityName}
            </h1>

            {/* 小天气徽章，增加趣味感 */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.24)',
                backdropFilter: 'blur(8px)',
                fontSize: '22px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              }}
            >
              🌤️
            </span>
          </div>

          {/* 顶部双栏布局 */}
          <div
            className="detail-hero-grid"
            style={{
              marginTop: '22px',
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 360px) 1fr',
              gap: '28px',
              alignItems: 'center',
            }}
          >
            {/* 左：当前 UV 摘要卡 */}
            <div
              style={{
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                padding: '22px 22px 20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                maxWidth: '320px',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.68)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                }}
              >
                ✷ UV Index
              </p>

              <span
                style={{
                  fontSize: '64px',
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {data.currentUV}
              </span>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <p
                  style={{
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {data.uvLabel}
                </p>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                >
                  SPF 30+ helpful
                </span>
              </div>

              {/* 底部渐变短线 */}
              <div
                style={{
                  marginTop: '20px',
                  width: '200px',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #67d4ff 0%, #8b5cf6 45%, #ec4899 100%)',
                }}
              />
            </div>

            {/* 右：说明区域 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '100%',
              }}
            >
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                }}
              >
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <span
                  style={{
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Sun protection recommended
                </span>
              </div>

              <div style={{ height: '22px' }} />

              <div
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '16px',
                  lineHeight: 1.8,
                  maxWidth: '500px',
                }}
              >
                Explore today’s UV pattern, skin protection advice, and outfit
                suggestions designed for current conditions.
              </div>

              {/* 小型统计胶囊，增加视觉趣味 */}
              <div
                style={{
                  marginTop: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <InfoChip icon="🔺" text={`Peak ${data.peakUV} at ${data.peakTime}`} />
                <InfoChip icon="🌅" text={`Lowest ${data.lowestUV} at ${data.lowestTime}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 主内容区 ───────────────────────────────────── */}
      <div
        style={{
          maxWidth: '920px',
          margin: '18px auto 0',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* ── Today’s UV Trend ─────────────────────────── */}
        <Card>
          <div style={{ marginBottom: '14px' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#1c1917',
                lineHeight: 1.2,
                marginBottom: '6px',
              }}
            >
              Today’s UV Trend
            </h2>

            <p
              style={{
                fontSize: '16px',
                color: '#57534e',
                lineHeight: 1.5,
              }}
            >
              Peak UV: <strong>{data.peakUV}</strong> ({data.peakTime}) | Lowest:{' '}
              <strong>{data.lowestUV}</strong> ({data.lowestTime})
            </p>
          </div>

          {/* 图表容器 */}
          <div
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #23252d 0%, #2c2f37 100%)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
              border: '1px solid #3f3f46',
            }}
          >
            {/* 顶部装饰点 */}
            <div
              style={{
                padding: '10px 14px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {['#71717a', '#71717a', '#71717a'].map((c, index) => (
                <span
                  key={index}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: c,
                  }}
                />
              ))}
            </div>

            {/* SVG 图表 */}
            <div style={{ padding: '8px 12px 10px' }}>
              <svg
                viewBox="0 0 920 360"
                width="100%"
                style={{ display: 'block' }}
                aria-label="UV trend chart"
              >
                <defs>
                  <linearGradient id="uvAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8b600" stopOpacity="0.35" />
                    <stop offset="45%" stopColor="#84cc16" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
                  </linearGradient>

                  <linearGradient id="uvLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4eb400" />
                    <stop offset="45%" stopColor="#f8b600" />
                    <stop offset="75%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#84cc16" />
                  </linearGradient>
                </defs>

                {/* 横向网格线 + 右侧刻度 */}
                {[0, 2, 4, 6, 8, 10, 12].map((tick) => {
                  const y =
                    chart.padding.top + chart.innerH - (tick / 12) * chart.innerH

                  return (
                    <g key={tick}>
                      <line
                        x1={chart.padding.left}
                        x2={920 - chart.padding.right}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={920 - 6}
                        y={y + 4}
                        textAnchor="end"
                        fill="#a1a1aa"
                        fontSize="11"
                      >
                        {tick}
                      </text>
                    </g>
                  )
                })}

                {/* 左侧风险等级标签 */}
                {[
                  { label: 'Extreme', value: 11 },
                  { label: 'Very high', value: 8 },
                  { label: 'High', value: 6 },
                  { label: 'Moderate', value: 3 },
                  { label: 'Low', value: 1 },
                ].map((item) => {
                  const y =
                    chart.padding.top + chart.innerH - (item.value / 12) * chart.innerH

                  return (
                    <text
                      key={item.label}
                      x={chart.padding.left + 6}
                      y={y - 6}
                      fill="#a1a1aa"
                      fontSize="10"
                    >
                      {item.label}
                    </text>
                  )
                })}

                {/* 竖向时间分隔线 */}
                {[0.25, 0.5, 0.75].map((pct, index) => {
                  const x = chart.padding.left + chart.innerW * pct
                  return (
                    <line
                      key={index}
                      x1={x}
                      x2={x}
                      y1={chart.padding.top}
                      y2={360 - chart.padding.bottom}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                  )
                })}

                {/* 面积图 */}
                <path d={chart.areaPath} fill="url(#uvAreaGradient)" />

                {/* 折线 */}
                <path
                  d={chart.linePath}
                  fill="none"
                  stroke="url(#uvLineGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 当前时间竖线 */}
                <line
                  x1={nowPoint.x}
                  x2={nowPoint.x}
                  y1={chart.padding.top}
                  y2={360 - chart.padding.bottom}
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="2"
                />

                {/* 当前点 */}
                <circle
                  cx={nowPoint.x}
                  cy={nowPoint.y}
                  r="7"
                  fill="#1f2937"
                  stroke="#facc15"
                  strokeWidth="3"
                />

                {/* X 轴时间标签 */}
                {[
                  chart.points[0],
                  chart.points[3],
                  chart.points[6],
                  chart.points[9],
                  chart.points[12],
                ].map((point, index) => (
                  <text
                    key={index}
                    x={point.x}
                    y={348}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="11"
                  >
                    {point.time}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* 图表说明 */}
          <div style={{ marginTop: '16px' }}>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1c1917',
                marginBottom: '4px',
              }}
            >
              Now, 17:56
            </p>
            <p
              style={{
                fontSize: '16px',
                color: '#44403c',
                lineHeight: 1.7,
              }}
            >
              {data.nowSummary}
            </p>
          </div>
        </Card>

        {/* ── Protection Advice ────────────────────────── */}
        <Card>
          <SectionTitle icon="🛡️" title="Protection Advice" />

          <div
            style={{
              marginTop: '14px',
              borderRadius: '20px',
              background: theme.adviceBg,
              border: `1px solid ${theme.adviceBorder}`,
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                marginBottom: '8px',
              }}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: theme.adviceText,
                  margin: 0,
                }}
              >
                {data.protectionAdvice.title}
              </h3>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: theme.adviceText,
                  background: 'rgba(255,255,255,0.45)',
                  padding: '5px 10px',
                  borderRadius: '999px',
                }}
              >
                ☀ Daily protection
              </span>
            </div>

            <p
              style={{
                fontSize: '16px',
                color: theme.adviceText,
                lineHeight: 1.7,
                marginBottom: '18px',
              }}
            >
              {data.protectionAdvice.description}
            </p>

            <div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: theme.adviceText,
                  marginBottom: '8px',
                }}
              >
                Recommended amount
              </p>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: theme.adviceText,
                }}
              >
                {data.protectionAdvice.recommendedAmount.map((item, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '15px',
                      lineHeight: 1.8,
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* ── Suggested Outfit ─────────────────────────── */}
        <Card>
          <SectionTitle icon="👕" title="Suggested Outfit" />

          <div
            style={{
              marginTop: '14px',
              borderRadius: '20px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#9f1239',
                  margin: 0,
                }}
              >
                {data.outfitAdvice.title}
              </h3>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {data.outfitAdvice.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#7c3aed',
                      background: '#ede9fe',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p
              style={{
                fontSize: '16px',
                color: '#881337',
                lineHeight: 1.75,
                marginBottom: '0',
              }}
            >
              {data.outfitAdvice.description}
            </p>
          </div>
        </Card>

        {/* ── 底部说明文字 ─────────────────────────────── */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#78716c',
            lineHeight: 1.7,
            padding: '10px 12px 24px',
            marginBottom: '18px',
          }}
        >
          This app’s outfit and sun protection suggestions are based on the World
          Health Organization (WHO) Ultraviolet Index (UVI).
        </div>
      </div>

      {/* ── 响应式适配 ─────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .detail-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

// ── 通用卡片组件 ──────────────────────────────────────────────
function Card({ children }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
      }}
    >
      {children}
    </div>
  )
}

// ── 模块标题组件 ──────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</span>
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1c1917',
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

// ── Hero 里的小信息胶囊组件 ───────────────────────────────────
function InfoChip({ icon, text }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.18)',
        padding: '6px 10px',
        borderRadius: '999px',
      }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  )
}