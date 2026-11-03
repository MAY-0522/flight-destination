'use strict'

const fs = require('fs')
const path = require('path')

const inputPath = path.join(__dirname, 'observations.json')
const outputPath = path.join(__dirname, 'analysis.json')
const moduleOutputPath = path.join(__dirname, 'analysis-data.js')
const observations = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const required = ['origin', 'destination', 'trip_type', 'flight_date', 'weekday', 'is_weekend', 'airline', 'price', 'currency', 'baggage', 'source', 'source_url', 'collected_at', 'days_before_departure']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
function quantile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const position = (sorted.length - 1) * p
  const lower = Math.floor(position)
  const fraction = position - lower
  return sorted[lower] + ((sorted[Math.ceil(position)] - sorted[lower]) * fraction)
}
function summarize(values) {
  if (!values.length) return { count: 0, average: null, median: null }
  return {
    count: values.length,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: median(values)
  }
}
function round(value) {
  return value === null ? null : Math.round(value * 100) / 100
}

assert(Array.isArray(observations), 'observations.json must contain an array')
for (const [index, row] of observations.entries()) {
  for (const field of required) assert(Object.prototype.hasOwnProperty.call(row, field), `row ${index + 1} missing ${field}`)
  assert(row.origin === 'KUL' && row.destination === 'PEN', `row ${index + 1} is not KUL → PEN`)
  assert(row.currency === 'MYR', `row ${index + 1} has unexpected currency ${row.currency}`)
  assert(Number.isFinite(row.price) && row.price > 0, `row ${index + 1} has invalid price`)
  assert(row.source_url.startsWith('https://'), `row ${index + 1} has invalid source_url`)
}

const byDate = new Map()
for (const row of observations) {
  if (!byDate.has(row.flight_date)) byDate.set(row.flight_date, [])
  byDate.get(row.flight_date).push(row.price)
}
const dateSamples = [...byDate.entries()].map(([flight_date, prices]) => {
  const date = new Date(`${flight_date}T00:00:00Z`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const daysBefore = Math.round((date - new Date('2026-10-26T00:00:00Z')) / 86400000)
  return { flight_date, weekday, is_weekend: weekday === 'Saturday' || weekday === 'Sunday', price: median(prices), days_before_departure: daysBefore }
})
const weekdays = {}
for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
  weekdays[day] = summarize(dateSamples.filter(sample => sample.weekday === day).map(sample => sample.price))
  weekdays[day].average = round(weekdays[day].average)
  weekdays[day].median = round(weekdays[day].median)
}
const weekdayPrices = dateSamples.filter(sample => !sample.is_weekend).map(sample => sample.price)
const weekendPrices = dateSamples.filter(sample => sample.is_weekend).map(sample => sample.price)
const weekdayAverage = summarize(weekdayPrices).average
const weekendAverage = summarize(weekendPrices).average
const leadRanges = [
  { label: '0–3 days', min: 0, max: 3 },
  { label: '4–7 days', min: 4, max: 7 },
  { label: '8–14 days', min: 8, max: 14 },
  { label: '15–30 days', min: 15, max: 30 },
  { label: '31–60 days', min: 31, max: 60 },
  { label: '60+ days', min: 61, max: Infinity }
]
const leadTime = leadRanges.map(range => {
  const values = dateSamples.filter(sample => sample.days_before_departure >= range.min && sample.days_before_departure <= range.max).map(sample => sample.price)
  const summary = summarize(values)
  return { range: range.label, count: summary.count, average: round(summary.average), median: round(summary.median) }
})
const rawPrices = observations.map(row => row.price)
const holidayRows = observations.filter(row => typeof row.is_holiday === 'boolean')
const holidayKnownDateCount = new Set(holidayRows.map(row => row.flight_date)).size
const sortedWeekdays = Object.entries(weekdays).filter(([, value]) => value.count).sort((a, b) => a[1].average - b[1].average)
const premium = weekdayAverage > 0 ? ((weekendAverage - weekdayAverage) / weekdayAverage) * 100 : null
const uniqueSources = [...new Set(observations.map(row => row.source))]
const collectionDates = [...new Set(observations.map(row => row.collected_at))].sort()

const result = {
  route: { origin: 'KUL', destination: 'PEN', trip_type: 'one_way', currency: 'MYR' },
  generated_at: new Date().toISOString(),
  sample: {
    observation_count: observations.length,
    distinct_departure_dates: dateSamples.length,
    sources: uniqueSources,
    collection_dates: collectionDates,
    reference_level: 'low',
    reference_reason: '单次截面快照，且覆盖日期和来源有限；不能代表历史成交价或稳定规律'
  },
  price_distribution_raw_quotes: {
    count: rawPrices.length,
    minimum: Math.min(...rawPrices),
    p10: round(quantile(rawPrices, 0.10)),
    p25: round(quantile(rawPrices, 0.25)),
    median: round(quantile(rawPrices, 0.50)),
    p75: round(quantile(rawPrices, 0.75)),
    p90: round(quantile(rawPrices, 0.90)),
    maximum: Math.max(...rawPrices)
  },
  weekday_effect_by_departure_date_median: {
    weekdays,
    lowest_average_day: sortedWeekdays[0]?.[0] || null,
    highest_average_day: sortedWeekdays[sortedWeekdays.length - 1]?.[0] || null,
    weekday_average: round(weekdayAverage),
    weekend_average: round(weekendAverage),
    weekend_premium_percentage: premium === null ? null : round(premium),
    method: '同一出发日期多个来源/标价先取中位数，再按出发星期汇总；描述性、低参考度'
  },
  advance_purchase_window_by_departure_date_median: {
    buckets: leadTime,
    lowest_average_window: leadTime.filter(bucket => bucket.count > 0).sort((a, b) => a.average - b.average)[0]?.range || null,
    method: '以快照日 2026-10-26 计算提前天数；属于不同出发日期的横截面对比，不能推断同一航班随时间的价格变化'
  },
  holiday_effect: holidayKnownDateCount >= 3
    ? { status: 'available', known_departure_dates: holidayKnownDateCount }
    : { status: 'insufficient_data', message: '假期状态未从来源样本中可靠确认，暂时无法判断节假日效应' },
  caveats: [
    '网页展示价可能变化，且不保证最终可订价、税费口径或行李额度一致。',
    '样本是单次页面快照，不是历史成交记录；不可据此保证未来价格。',
    '不同来源的标价口径可能不同，星期与提前购买结果仅作流程验证。'
  ]
}

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
fs.writeFileSync(moduleOutputPath, `module.exports = ${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))

