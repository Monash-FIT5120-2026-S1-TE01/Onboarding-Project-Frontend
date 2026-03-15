import { useState, useEffect, useMemo } from 'react'

// ── 支持城市白名单（用于根据城市名获取 timezone）──────────────────────────
// Detail 页面会从 localStorage 读取当前选中的城市，再用城市名匹配 timezone。
// 如果后端后续支持更多城市，可以在这里继续补充。
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

// ── 接口地址────────────────
// 说明：
// 为了保证代码风格统一，这里也先沿用相同方式。
// 后续如果统一切换 Azure 地址，只需要改这里这一行。

// ── 获取城市对应 timezone ─────────────────────────────────────────────
function getTimezone(cityName) {
  const found = SUPPORTED_CITIES.find(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  )
  return found?.timezone ?? 'Australia/Sydney'
}

// ── 天气标签标准化 ───────────────────────────────────────────────────
// 说明：
// 后端 weather_label 可能返回不同描述，这里先统一映射为页面更稳定的标签。
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

// ── 天气图标与文案 ───────────────────────────────────────────────────
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

// ── UV 等级主题工具函数 ─────────────────────────────────────────────
// 说明：
// 根据 UV 值切换 Hero 主色、建议卡颜色等。
// 保留原来的视觉逻辑，不改变页面整体布局。
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

// ── 将数字 UV 值转换为文字等级 ────────────────────────────────────────
function getUVLabel(uvi) {
  return getUVTheme(uvi).label
}

// ── 时间格式化：Hero 顶部日期时间 ─────────────────────────────────────
// 说明：
// 目标格式和 Home 页面保持接近：Sun, 15 Mar · 01:54 am
function formatHeroDateLabel(isoString) {
  const date = isoString ? new Date(isoString) : new Date()

  const datePart = date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timePart = date
    .toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase()

  return `${datePart} · ${timePart}`
}

// ── 时间格式化：用于图表 X 轴和说明文字 ────────────────────────────────
// 例：2026-03-15T16:00 -> 4 PM
function formatHourLabel(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    hour12: true,
  }).replace(':00', '')
}

// 例：2026-03-15T16:00 -> 16:00
function formatClockTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ── 合并过去 / 当前 / 未来 UV 数据为统一图表数组 ───────────────────────
// 说明：
// 1. 后端现在返回：past / current / forecast 三段数据。
// 2. 为了维持当前页面的图表逻辑，这里把三段统一合并成 uvTrend。
// 3. 最终结构统一为：[{ time, value, iso }]
function buildTrendData(res) {
  const map = new Map()

  const pastUV = res?.past_uv_index_time?.uv_index ?? []
  const pastDT = res?.past_uv_index_time?.datetime ?? []

  pastDT.forEach((iso, index) => {
    map.set(iso, {
      iso,
      time: formatHourLabel(iso),
      value: Number(pastUV[index] ?? 0),
    })
  })

  const currentIso = res?.current_uv_index_time?.datetime
  const currentUV = Number(res?.current_uv_index_time?.uv_index ?? 0)

  if (currentIso) {
    map.set(currentIso, {
      iso: currentIso,
      time: formatHourLabel(currentIso),
      value: currentUV,
    })
  }

  const forecastUV = res?.forecast_uv_index_time?.uv_index ?? []
  const forecastDT = res?.forecast_uv_index_time?.datetime ?? []

  forecastDT.forEach((iso, index) => {
    map.set(iso, {
      iso,
      time: formatHourLabel(iso),
      value: Number(forecastUV[index] ?? 0),
    })
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()
  )
}

// ── 从图表数据中找出峰值和最低值 ───────────────────────────────────────
function getPeakAndLowest(uvTrend) {
  if (!uvTrend.length) {
    return {
      peakUV: 0,
      peakTime: '--',
      lowestUV: 0,
      lowestTime: '--',
    }
  }

  let peak = uvTrend[0]
  let lowest = uvTrend[0]

  uvTrend.forEach(item => {
    if (item.value > peak.value) peak = item
    if (item.value < lowest.value) lowest = item
  })

  return {
    peakUV: peak.value,
    peakTime: peak.time,
    lowestUV: lowest.value,
    lowestTime: lowest.time,
  }
}

// ── 构建当前说明文案 ────────────────────────────────────────────────
// 说明：
// 这里根据图表数据自动生成 Today’s UV Trend 下方说明文字，
// “数据驱动描述”。
function buildNowSummary(currentUV, uvTrend) {
  if (!uvTrend.length) {
    return 'UV data is currently unavailable. Please check again later.'
  }

  // 找出 UV >= 3 的时间段，用于生成“Moderate or higher”描述
  const moderateOrHigher = uvTrend.filter(item => item.value >= 3)

  if (!moderateOrHigher.length) {
    return `UV is currently low. Protection is generally not required right now, but staying informed is still recommended.`
  }

  const first = moderateOrHigher[0]
  const last = moderateOrHigher[moderateOrHigher.length - 1]
  const currentLabel = getUVLabel(currentUV)

  return `UV is currently ${currentLabel.toLowerCase()}. Levels of Moderate or higher are expected from ${first.time} to ${last.time} today.`
}

// ── 生成防晒建议文案 ────────────────────────────────────────────────
// 说明：
// 后端当前主要给到 SPF，warnings 可能为空，所以这里做前端兜底。
function buildProtectionAdvice(spf, warningsObj, currentUV) {
  const warningValues = warningsObj && typeof warningsObj === 'object'
    ? Object.values(warningsObj).filter(Boolean)
    : []

  let description = `Use broad-spectrum SPF ${spf}+ sunscreen. Apply 20 minutes before outdoor exposure and reapply every 2 hours.`

  if (warningValues.length > 0) {
    description = `${description} ${warningValues.join(' ')}`
  } else if (currentUV >= 6) {
    description = `${description} Extra caution is advised during peak UV hours.`
  } else if (currentUV >= 3) {
    description = `${description} Shade, sunglasses, and a hat are recommended during outdoor activities.`
  }

  return {
    title: 'Sunscreen',
    description,
    recommendedAmount: [
      'Face & neck: ~1 teaspoon',
      'Arms and legs: apply generously',
      'Whole body: about 30–35 mL',
    ],
  }
}

// ── 生成穿搭建议内容 ────────────────────────────────────────────────
// 说明：
// 后端返回 sugg_cloth 时优先使用；若为空或 “No suggestion.”，则前端提供兜底。
function buildOutfitAdvice(suggCloth, weatherLabel, temperature, currentUV) {
  const noSuggestion =
    !suggCloth ||
    suggCloth.trim() === '' ||
    suggCloth.trim().toLowerCase() === 'no suggestion.'

  let description = suggCloth

  if (noSuggestion) {
    if (currentUV >= 6) {
      description =
        'UV levels are high today. Lightweight long sleeves, sunglasses, and a wide-brim hat are recommended for better protection outdoors.'
    } else if (temperature >= 26) {
      description =
        'It is warm outside today. Choose breathable clothing and bring sunglasses and a hat for additional sun protection.'
    } else if (weatherLabel.toLowerCase().includes('cloudy')) {
      description =
        'It may look cloudy, but UV can still affect exposed skin. Light layers, sunglasses, and a hat remain a good choice.'
    } else {
      description =
        'Dress comfortably for today’s conditions, and consider sunglasses or a hat during outdoor exposure.'
    }
  }

  const tags = []
  if (temperature >= 26) tags.push('#WarmWeather')
  if (currentUV >= 3) tags.push('#SunSmart')
  if (weatherLabel.toLowerCase().includes('cloudy')) tags.push('#CloudyDay')
  if (tags.length === 0) tags.push('#DailyComfort')

  return {
    title: 'Sun-Smart Casual',
    tags,
    description,
  }
}

// ── 将后端原始返回映射为 Detail 页面使用的数据结构 ─────────────────────
// 说明：
// 这是本文件里最关键的“数据适配层”。
// 后续如果后端字段变动，优先改这个函数即可，页面主体布局基本不用改。
function mapResponseToDetailData(res, cityName) {
  const uvTrend = buildTrendData(res)
  const currentUV = Number(res?.current_uv_index_time?.uv_index ?? 0)
  const currentDateTime = res?.current_uv_index_time?.datetime ?? null
  const weatherLabel = parseWeatherLabel(res?.weather_label)
  const temperature = Number(res?.temperature ?? 0)
  const spf = Number(res?.spf ?? 30)

  const { peakUV, peakTime, lowestUV, lowestTime } = getPeakAndLowest(uvTrend)

  return {
    cityName: cityName || res?.city || 'Melbourne',
    dateLabel: formatHeroDateLabel(currentDateTime),
    currentUV,
    uvLabel: getUVLabel(currentUV),
    peakUV,
    peakTime,
    lowestUV,
    lowestTime,
    currentTimeLabel: currentDateTime ? formatClockTime(currentDateTime) : '--:--',
    nowSummary: buildNowSummary(currentUV, uvTrend),
    protectionAdvice: buildProtectionAdvice(spf, res?.warnings, currentUV),
    outfitAdvice: buildOutfitAdvice(res?.sugg_cloth, weatherLabel, temperature, currentUV),
    uvTrend,
    weatherLabel,
    temperature,
    spf,
  }
}

// ── 构建 SVG 图表点位 ─────────────────────────────────────────────
// 说明：
// 当前仍沿用你原来的 SVG 绘图方案，不改变图表展现方式。
function buildChartGeometry(data, width, height, maxY = 12) {
  const safeData = data.length > 1 ? data : [
    { time: '12 AM', value: 0, iso: 'fallback-1' },
    { time: '1 AM', value: 0, iso: 'fallback-2' },
  ]

  const padding = { top: 18, right: 18, bottom: 28, left: 18 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const points = safeData.map((item, index) => {
    const x = padding.left + (index / (safeData.length - 1)) * innerW
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
  // ── 页面状态 ───────────────────────────────────────────────
  // 说明：
  // 1. data：存放已经映射好的页面数据
  // 2. loading / error
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── 页面加载时请求后端真实数据 ──────────────────────────────
  useEffect(() => {
    // 读取当前选中的城市（逻辑与 Home 页面保持一致）
    const cityId = localStorage.getItem('sunsense_selected_city') ?? 'melbourne'
    const stored = localStorage.getItem('sunsense_cities')
    const cities = stored ? JSON.parse(stored) : []
    const city = cities.find(c => c.id === cityId)

    const cityName = city?.name ?? 'Melbourne'
    const timezone = city?.timezone ?? getTimezone(cityName)

    setLoading(true)
    setError(null)

    fetch('https://uv-level-monitor-anb3fvckcsfcf4a3.australiaeast-01.azurewebsites.net/update_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city_name: cityName.toLowerCase(),
        timezone: timezone,
        sun_screen_efficiency: 0.8,
        skin_type: 3,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then(res => {
        const mapped = mapResponseToDetailData(res, cityName)
        setData(mapped)
        setLoading(false)
      })
      .catch(() => {
        setError('Unable to load detail data. Please check your connection.')
        setLoading(false)
      })
  }, [])

  // ── Loading 状态 ───────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>☀️</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading detail data...</p>
        </div>
      </div>
    )
  }

  // ── Error 状态 ─────────────────────────────────────────────
  if (error || !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</p>
          <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.6 }}>
            {error ?? 'Unable to load page data.'}
          </p>
        </div>
      </div>
    )
  }

  // ── 派生展示数据 ───────────────────────────────────────────
  const theme = getUVTheme(data.currentUV)
  const weather = getWeatherInfo(data.weatherLabel)

  // 图表几何数据
  const chart = useMemo(() => {
    return buildChartGeometry(data.uvTrend, 920, 360, 12)
  }, [data.uvTrend])

  // 当前时间高亮点：
  // 这里取图表中最接近“当前时间点”的那个点。由于 current 数据已被合并进 uvTrend，
  // 一般取“最后一个过去或当前点”即可。
  const nowPointIndex = Math.max(0, Math.min(chart.points.length - 1, data.uvTrend.findIndex(
    item => formatClockTime(item.iso ?? '') === data.currentTimeLabel
  )))
  const nowPoint =
    nowPointIndex >= 0 && chart.points[nowPointIndex]
      ? chart.points[nowPointIndex]
      : chart.points[Math.max(0, chart.points.length - 2)] ?? chart.points[0]

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

            {/* 小天气徽章：保留你原先的趣味元素，并让视觉语言更接近队友页面 */}
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
              {weather.icon}
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
                {data.currentUV.toFixed(2)}
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
                  SPF {data.spf}+ helpful
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
                  {data.currentUV > 3 ? 'Sun protection recommended' : 'UV levels currently low'}
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

              {/* 小型统计胶囊 */}
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
                <InfoChip icon="🌡️" text={`${data.temperature}° · ${weather.desc}`} />
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

                {/* X 轴时间标签：动态取 5 个节点，避免写死 */}
                {chart.points
                  .filter((_, index) => {
                    if (chart.points.length <= 5) return true
                    const step = Math.floor((chart.points.length - 1) / 4)
                    return index === 0 || index === chart.points.length - 1 || index % step === 0
                  })
                  .slice(0, 5)
                  .map((point, index) => (
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
              Now, {data.currentTimeLabel}
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
