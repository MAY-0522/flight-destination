'use strict'

const fs = require('fs')
const path = require('path')

const root = __dirname
const routesRoot = path.join(root, 'routes')
const routeDirs = fs.existsSync(routesRoot)
  ? fs.readdirSync(routesRoot).filter(name => fs.statSync(path.join(routesRoot, name)).isDirectory()).map(name => path.join(routesRoot, name))
  : []
const round = value => value == null ? null : Math.round(value * 100) / 100
const median = values => {
  const sorted = values.slice().sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const quantile = (values, p) => {
  const sorted = values.slice().sort((a, b) => a - b)
  if (!sorted.length) return null
  const position = (sorted.length - 1) * p
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}
const summarize = values => values.length
  ? { count: values.length, average: round(values.reduce((sum, value) => sum + value, 0) / values.length), median: round(median(values)) }
  : { count: 0, average: null, median: null }
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdayLabel = date => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
const dateDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

const reports = []
for (const dir of routeDirs) {
  const observationsPath = path.join(dir, 'observations.json')
  const routePath = path.join(dir, 'route.json')
  if (!fs.existsSync(observationsPath) || !fs.existsSync(routePath)) continue
  const observations = JSON.parse(fs.readFileSync(observationsPath, 'utf8'))
  if (!observations.length) continue
  const route = JSON.parse(fs.readFileSync(routePath, 'utf8'))
  if (route.trip_type !== 'round_trip') throw new Error(`${path.basename(dir)} route must use trip_type round_trip`)

  for (const [index, row] of observations.entries()) {
    const required = ['origin', 'destination', 'trip_type', 'flight_date', 'return_date', 'weekday', 'is_weekend', 'airline', 'price', 'currency', 'baggage', 'source', 'source_url', 'collected_at', 'days_before_departure']
    for (const key of required) if (!(key in row)) throw new Error(`${path.basename(dir)} row ${index + 1} missing ${key}`)
    if (row.trip_type !== 'round_trip' || row.origin !== route.origin || row.destination !== route.destination || row.currency !== route.currency) throw new Error(`${path.basename(dir)} row ${index + 1} route/type/currency mismatch`)
    const durationDays = dateDiff(row.flight_date, row.return_date)
    if (!Number.isFinite(durationDays) || durationDays <= 0) throw new Error(`${path.basename(dir)} row ${index + 1} return_date must be after flight_date`)
    if (!Number.isFinite(row.price) || row.price <= 0 || !row.source_url.startsWith('https://')) throw new Error(`${path.basename(dir)} row ${index + 1} invalid fare/source`)
  }

  const itineraries = new Map()
  for (const row of observations) {
    const key = `${row.flight_date}|${row.return_date}`
    if (!itineraries.has(key)) itineraries.set(key, [])
    itineraries.get(key).push(row)
  }
  const samples = [...itineraries.entries()].map(([key, rows]) => {
    const [flightDate, returnDate] = key.split('|')
    const first = rows[0]
    return {
      flight_date: flightDate,
      return_date: returnDate,
      trip_duration_days: dateDiff(flightDate, returnDate),
      weekday: weekdayLabel(flightDate),
      is_weekend: weekdayLabel(flightDate) === 'Saturday' || weekdayLabel(flightDate) === 'Sunday',
      price: median(rows.map(row => row.price)),
      days_before_departure: first.days_before_departure
    }
  })
  const weekdays = {}
  for (const day of dayNames) weekdays[day] = summarize(samples.filter(sample => sample.weekday === day).map(sample => sample.price))
  const weekdayValues = samples.filter(sample => !sample.is_weekend).map(sample => sample.price)
  const weekendValues = samples.filter(sample => sample.is_weekend).map(sample => sample.price)
  const weekdayAverage = weekdayValues.length ? weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length : null
  const weekendAverage = weekendValues.length ? weekendValues.reduce((sum, value) => sum + value, 0) / weekendValues.length : null
  const advanceRanges = [
    { label: '0–3 days', min: 0, max: 3 }, { label: '4–7 days', min: 4, max: 7 },
    { label: '8–14 days', min: 8, max: 14 }, { label: '15–30 days', min: 15, max: 30 },
    { label: '31–60 days', min: 31, max: 60 }, { label: '60+ days', min: 61, max: Infinity }
  ]
  const advanceBuckets = advanceRanges.map(range => {
    const values = samples.filter(sample => sample.days_before_departure >= range.min && sample.days_before_departure <= range.max).map(sample => sample.price)
    return { range: range.label, ...summarize(values) }
  })
  const durationRanges = [
    { label: '1–3 晚', min: 1, max: 3 }, { label: '4–7 晚', min: 4, max: 7 },
    { label: '8–14 晚', min: 8, max: 14 }, { label: '15 晚以上', min: 15, max: Infinity }
  ]
  const durationBuckets = durationRanges.map(range => ({
    range: range.label,
    ...summarize(samples.filter(sample => sample.trip_duration_days >= range.min && sample.trip_duration_days <= range.max).map(sample => sample.price))
  }))
  const values = observations.map(row => row.price)
  const ordered = Object.entries(weekdays).filter(([, value]) => value.count).sort((a, b) => a[1].average - b[1].average)
  const sources = [...new Set(observations.map(row => row.source))]
  const collectionDates = [...new Set(observations.map(row => row.collected_at))].sort()
  const sampleCount = observations.length
  const report = {
    route: { origin: route.origin, destination: route.destination, trip_type: 'round_trip', currency: route.currency },
    generated_at: new Date().toISOString(),
    sample: {
      observation_count: sampleCount,
      distinct_departure_dates: new Set(samples.map(sample => sample.flight_date)).size,
      distinct_itineraries: samples.length,
      sources,
      collection_dates: collectionDates,
      source_freshness_note: route.source_freshness_note || '来源页面采集时间未单独标注',
      reference_level: sampleCount >= 200 ? '较高' : sampleCount >= 50 ? '一般' : '较低',
      reference_reason: `本次仅收集到 ${sampleCount} 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。`
    },
    price_distribution_raw_quotes: {
      count: values.length, minimum: Math.min(...values), p10: round(quantile(values, .1)),
      p25: round(quantile(values, .25)), median: round(quantile(values, .5)),
      p75: round(quantile(values, .75)), p90: round(quantile(values, .9)), maximum: Math.max(...values)
    },
    weekday_effect_by_departure_date_median: {
      weekdays,
      lowest_average_day: ordered[0]?.[0] || null,
      highest_average_day: ordered[ordered.length - 1]?.[0] || null,
      weekday_average: round(weekdayAverage),
      weekend_average: round(weekendAverage),
      weekend_premium_percentage: weekdayAverage && weekendAverage ? round((weekendAverage - weekdayAverage) / weekdayAverage * 100) : null,
      method: '按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。'
    },
    advance_purchase_window_by_departure_date_median: {
      buckets: advanceBuckets,
      lowest_average_window: advanceBuckets.filter(bucket => bucket.count).sort((a, b) => a.average - b.average)[0]?.range || null,
      method: '以采集日计算距去程日期的天数；仅作横截面描述。'
    },
    round_trip_duration: {
      median_nights: median(samples.map(sample => sample.trip_duration_days)),
      buckets: durationBuckets,
      method: '按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。'
    },
    holiday_effect: { status: 'insufficient_data', message: '当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。' },
    caveats: ['这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。', '去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。']
  }
  fs.writeFileSync(path.join(dir, 'analysis.json'), `${JSON.stringify(report, null, 2)}\n`)
  fs.writeFileSync(path.join(dir, 'analysis-data.js'), `module.exports = ${JSON.stringify(report, null, 2)}\n`)
  reports.push({ destination: route.destination, relative: path.relative(root, dir).replace(/\\/g, '/') })
  console.log(`${route.origin}-${route.destination}: ${sampleCount} round-trip quotes / ${samples.length} itineraries`)
}

const entries = reports.map(item => `  ${JSON.stringify(item.destination)}: require('./${item.relative}/analysis-data.js')`)
fs.writeFileSync(path.join(root, 'route-reports.js'), `// Generated by analyze-round-trips.js; only verified round-trip reports belong here.\nmodule.exports = {\n${entries.join(',\n')}${entries.length ? '\n' : ''}}\n`)
console.log(`Generated ${reports.length} round-trip route reports.`)
