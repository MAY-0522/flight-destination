const BASELINE = require('./sample-index-data.js')

function identity(row, destination, tripType) {
  if (!row || row.trip_type !== tripType) return ''
  const flightDate = row.flight_date || row.departure_date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate || '')) return ''
  const itinerary = tripType === 'round_trip' ? (row.return_date || '') : ''
  const recordKind = row.record_kind || (flightDate < String(row.collected_at || row.last_seen || '').slice(0, 10) ? 'historical_public_quote' : 'public_quote')
  const value = [recordKind, row.source_url || row.source || 'unknown', row.destination || destination, tripType, flightDate, itinerary].join('|')
  return hash(value, 2166136261) + hash(value, 2246822519)
}

function hash(value, seed) {
  let result = seed >>> 0
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619) >>> 0
  }
  return result.toString(16).padStart(8, '0')
}

function summarize(destination, tripType, liveRows) {
  const baseline = (BASELINE[tripType] || {})[destination] || { keys: [], dates: [], collectionDates: [] }
  const keys = new Set(baseline.keys)
  const cloudKeys = new Set()
  const dates = new Set(baseline.dates)
  const collectionDates = new Set(baseline.collectionDates)
  ;(liveRows || []).forEach(row => {
    if (!row || (row.destination && row.destination !== destination)) return
    const rowKey = identity(row, destination, tripType)
    if (!rowKey) return
    cloudKeys.add(rowKey)
    keys.add(rowKey)
    dates.add(row.flight_date || row.departure_date)
    const collected = row.collected_at || row.last_seen || row.last_seen_at || row.observed_at
    if (collected) collectionDates.add(String(collected).slice(0, 10))
  })
  return {
    sampleCount: keys.size,
    dateCount: dates.size,
    cloudSampleCount: cloudKeys.size,
    collectionDates: [...collectionDates].sort()
  }
}

module.exports = { summarize }
