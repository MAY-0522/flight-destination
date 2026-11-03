'use strict'

const currency = require('../utils/currency-config.js')
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const LEAD_RANGES = [
  { label: '0–3 days', min: 0, max: 3 }, { label: '4–7 days', min: 4, max: 7 },
  { label: '8–14 days', min: 8, max: 14 }, { label: '15–30 days', min: 15, max: 30 },
  { label: '31–60 days', min: 31, max: 60 }, { label: '60+ days', min: 61, max: Infinity }
]
const DURATION_RANGES = [
  { label: '1–3 晚', min: 1, max: 3 }, { label: '4–7 晚', min: 4, max: 7 },
  { label: '8–14 晚', min: 8, max: 14 }, { label: '15 晚以上', min: 15, max: Infinity }
]
const round = value => value == null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100
const recordKind = row => row.record_kind || ((row.flight_date || '') < String(row.collected_at || row.last_seen || '').slice(0, 10) ? 'historical_public_quote' : 'public_quote')
const withinPastYear = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 365)
  return date >= cutoff.toISOString().slice(0, 10) && date <= today
}
const isWithinRecordWindow = row => {
  const kind = recordKind(row)
  if (kind === 'documented_transaction') return withinPastYear(row.order_date)
  const departure = row.flight_date || row.departure_date || ''
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return departure >= today || withinPastYear(departure)
}
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
  const low = Math.floor(position), high = Math.ceil(position)
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low)
}
const summarize = values => values.length
  ? { count: values.length, average: round(values.reduce((sum, value) => sum + value, 0) / values.length), median: round(median(values)) }
  : { count: 0, average: null, median: null }
const weekday = date => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
const dayDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

function emptyReport(destination, tripType, sourceCurrency) {
  return {
    route: { origin: 'KUL', destination, trip_type: tripType, currency: sourceCurrency || 'MYR' },
    sample: { observation_count: 0, distinct_departure_dates: 0, sources: [], collection_dates: [], record_type_counts: {}, reference_level: '较低', reference_reason: '', source_freshness_note: '' },
    price_distribution_raw_quotes: {},
    weekday_effect_by_departure_date_median: { weekdays: {}, lowest_average_day: null, highest_average_day: null, weekday_average: null, weekend_average: null, weekend_premium_percentage: null },
    advance_purchase_window_by_departure_date_median: { buckets: [], lowest_average_window: null },
    holiday_effect: { message: '当前云端样本未标注节假日，暂时无法判断节假日价格规律。' },
    round_trip_duration: { median_nights: null, buckets: [] }
  }
}

function analyzeWithLiveFares(baseReport, baselineRows, liveRows, cloudSummary, routeInfo) {
  const route = routeInfo || (baseReport && baseReport.route) || {}
  const tripType = route.tripType || (baseReport && baseReport.route.trip_type) || 'one_way'
  const destination = route.destination || (baseReport && baseReport.route.destination)
  const validLive = (liveRows || []).filter(row => row && row.trip_type === tripType && row.flight_date && Number.isFinite(Number(row.price)) && isWithinRecordWindow(row))
  const reportBase = baseReport || (validLive.length ? emptyReport(destination, tripType, validLive[0].currency) : null)
  if (!reportBase) return null
  const rowsByIdentity = new Map()
  const add = (row, live) => {
    if (!row || row.trip_type !== tripType || !row.flight_date || !Number.isFinite(Number(row.price)) || !isWithinRecordWindow(row)) return
    const itinerary = tripType === 'round_trip' ? (row.return_date || '') : ''
    const identity = [recordKind(row), row.source_url || row.source || 'unknown', row.destination, row.trip_type, row.flight_date, itinerary].join('|')
    const sourceCurrency = row.source_currency || row.currency || (baseReport && baseReport.route && baseReport.route.currency) || 'MYR'
    const cnyPrice = row.price_cny !== undefined && Number.isFinite(Number(row.price_cny))
      ? Number(row.price_cny)
      : currency.toCny(Number(row.price), sourceCurrency)
    if (cnyPrice === null) return
    const normalizedRow = Object.assign({}, row, {
      source_price: row.source_price === undefined ? Number(row.price) : row.source_price,
      source_currency: sourceCurrency,
      price: cnyPrice,
      currency: 'CNY'
    })
    const old = rowsByIdentity.get(identity)
    const timestamp = String(row.last_seen_at || row.observed_at || row.last_seen || row.collected_at || '')
    const oldTimestamp = old ? String(old.row.last_seen_at || old.row.observed_at || old.row.last_seen || old.row.collected_at || '') : ''
    if (!old || timestamp > oldTimestamp || (timestamp === oldTimestamp && live && !old.live)) rowsByIdentity.set(identity, { row: normalizedRow, live })
  }
  ;(baselineRows || []).forEach(row => add(row, false))
  validLive.forEach(row => add(row, true))
  const observations = [...rowsByIdentity.values()].map(item => item.row)
  const report = JSON.parse(JSON.stringify(reportBase))
  report.live_observation_count = validLive.length
  report.live_unique_observation_count = new Set(validLive.map(row => [recordKind(row), row.source_url || row.source || 'unknown', row.destination || destination, row.trip_type, row.flight_date, tripType === 'round_trip' ? (row.return_date || '') : ''].join('|'))).size
  report.cloud_summary = cloudSummary || null
  if (!observations.length) return report
  report.route.currency = 'CNY'

  const values = observations.map(row => Number(row.price))
  const dates = new Map()
  observations.forEach(row => {
    const key = tripType === 'round_trip' ? `${row.flight_date}|${row.return_date || ''}` : row.flight_date
    if (!dates.has(key)) dates.set(key, [])
    dates.get(key).push(row)
  })
  const samples = [...dates.entries()].map(([key, grouped]) => {
    const first = grouped[0]
    const departure = first.flight_date
    const day = weekday(departure)
    const leadOffsets = grouped.map(row => {
      if (row.days_before_departure !== null && row.days_before_departure !== '' && Number.isFinite(Number(row.days_before_departure))) return Number(row.days_before_departure)
      const referenceDate = row.purchase_date || row.quoted_at || row.collected_at || row.last_seen
      return referenceDate ? dayDiff(referenceDate, departure) : -1
    }).filter(value => value >= 0)
    const daysBefore = leadOffsets.length ? Math.min(...leadOffsets) : -1
    return {
      key, departure, day, weekend: day === 'Saturday' || day === 'Sunday',
      price: median(grouped.map(row => Number(row.price))),
      daysBefore,
      duration: tripType === 'round_trip' && first.return_date ? dayDiff(departure, first.return_date) : null
    }
  })
  const weekdays = {}
  DAYS.forEach(day => { weekdays[day] = summarize(samples.filter(sample => sample.day === day).map(sample => sample.price)) })
  const weekdayValues = samples.filter(sample => !sample.weekend).map(sample => sample.price)
  const weekendValues = samples.filter(sample => sample.weekend).map(sample => sample.price)
  const weekdayAverage = weekdayValues.length ? weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length : null
  const weekendAverage = weekendValues.length ? weekendValues.reduce((sum, value) => sum + value, 0) / weekendValues.length : null
  const ordered = Object.entries(weekdays).filter(([, item]) => item.count).sort((a, b) => a[1].average - b[1].average)
  const leadBuckets = LEAD_RANGES.map(range => ({ range: range.label, ...summarize(samples.filter(sample => sample.daysBefore >= range.min && sample.daysBefore <= range.max).map(sample => sample.price)) }))
  const allSources = [...new Set(observations.map(row => row.source).filter(Boolean))]
  const collectionDates = [...new Set(observations.map(row => row.collected_at || row.last_seen).filter(Boolean))].sort()
  const recordTypeCounts = observations.reduce((counts, row) => {
    const type = recordKind(row)
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})

  report.price_distribution_raw_quotes = {
    count: values.length, minimum: Math.min(...values), p10: round(quantile(values, .1)), p25: round(quantile(values, .25)),
    median: round(quantile(values, .5)), p75: round(quantile(values, .75)), p90: round(quantile(values, .9)), maximum: Math.max(...values)
  }
  report.weekday_effect_by_departure_date_median = {
    weekdays, lowest_average_day: ordered[0] ? ordered[0][0] : null, highest_average_day: ordered.length ? ordered[ordered.length - 1][0] : null,
    weekday_average: round(weekdayAverage), weekend_average: round(weekendAverage),
    weekend_premium_percentage: weekdayAverage && weekendAverage ? round((weekendAverage - weekdayAverage) / weekdayAverage * 100) : null,
    method: '按来源与行程日期保留最新一条报价，再按出发日期中位数描述汇总；不是稳定规律'
  }
  report.advance_purchase_window_by_departure_date_median = {
    buckets: leadBuckets,
    lowest_average_window: leadBuckets.filter(bucket => bucket.count).sort((a, b) => a.average - b.average)[0]?.range || null,
    method: '以每条报价的采集日计算提前天数；同一来源和行程日期仅取最新观察，不能推断同一航班价格随时间变化'
  }
  if (tripType === 'round_trip') {
    const durations = samples.map(sample => sample.duration).filter(value => Number.isFinite(value) && value > 0)
    report.round_trip_duration = {
      median_nights: median(durations),
      buckets: DURATION_RANGES.map(range => ({ range: range.label, ...summarize(samples.filter(sample => sample.duration >= range.min && sample.duration <= range.max).map(sample => sample.price)) })),
      method: '按去程与返程日期差计算晚数；仅为描述性比较'
    }
    report.sample.distinct_itineraries = samples.length
  }
  report.sample.observation_count = observations.length
  report.sample.distinct_departure_dates = new Set(samples.map(sample => sample.departure)).size
  report.sample.sources = allSources
  report.sample.collection_dates = collectionDates
  report.sample.record_type_counts = recordTypeCounts
  report.sample.reference_level = observations.length >= 200 ? '较高' : observations.length >= 50 ? '一般' : '较低'
  report.sample.reference_reason = `合并 ${observations.length} 条本地与云端样本，其中当前云端有 ${report.live_unique_observation_count} 条匹配记录；记录类型分别展示，相同来源、行程和记录类型仅保留最新记录。`
  report.sample.source_freshness_note = cloudSummary && cloudSummary.generated_at
    ? `每日任务分析于 ${cloudSummary.generated_at} 生成；来源网页仍按每 7 天轮询，仅纳入近一年内的过去日期报价与带日期的网页订单记录。订单记录按页面自述识别，未独立核验。`
    : '过去日期报价和网页订单记录仅保留近一年；订单记录须有带日期的公开下单或付款描述，按页面自述识别，未独立核验。'
  report.live_source_urls = [...new Set(validLive.map(row => row.source_url).filter(Boolean))]
  return report
}

module.exports = { analyzeWithLiveFares }
