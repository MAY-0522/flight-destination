import { SOURCES } from './routes.js'

const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_QUOTES_PER_ROUTE = 1200
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    }
  })
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&pound;/gi, '£')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
}

function visibleText(html) {
  return decodeHtml(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDates(text) {
  const expression = /\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,]?\s*)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})(?:[,]?\s+(20\d{2}))?\b/gi
  const matches = []
  let match
  while ((match = expression.exec(text))) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()]
    if (month === undefined) continue
    let year = match[3] ? Number(match[3]) : new Date().getUTCFullYear()
    const now = new Date()
    let date = new Date(Date.UTC(year, month, Number(match[1])))
    if (!match[3] && date.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)) {
      date = new Date(Date.UTC(year + 1, month, Number(match[1])))
      year += 1
    }
    if (date.getUTCMonth() !== month || date.getUTCDate() !== Number(match[1])) continue
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`
    matches.push({ index: match.index, end: expression.lastIndex, iso, explicit_year: !!match[3] })
  }
  // ISO dates are common in archived fare pages and public trip records.
  const isoExpression = /\b(20\d{2})-(\d{2})-(\d{2})\b/g
  while ((match = isoExpression.exec(text))) {
    const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3])
    const date = new Date(Date.UTC(year, month, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) continue
    matches.push({ index: match.index, end: isoExpression.lastIndex, iso: match[0], explicit_year: true })
  }
  matches.sort((a, b) => a.index - b.index)
  return matches
}

function parsePrices(text) {
  const expression = /\b(?:RM|MYR)\s*([\d,]+(?:\.\d{1,2})?)\b/gi
  const matches = []
  let match
  while ((match = expression.exec(text))) {
    const prefix = text.slice(Math.max(0, match.index - 18), match.index)
    if (/\bfrom\s*$/i.test(prefix)) continue
    const amount = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(amount) && amount > 0) {
      matches.push({ index: match.index, amount })
    }
  }
  return matches
}

function quoteRecordKind(quote) {
  return quote && quote.record_kind
    ? quote.record_kind
    : quote && quote.departure_date < String(quote.collected_at || quote.last_seen || '').slice(0, 10)
      ? 'historical_public_quote'
      : 'public_quote'
}

function isWithinPastYear(dateText, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '') || dateText > today) return false
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 365)
  return dateText >= cutoff.toISOString().slice(0, 10)
}

function isQuoteWithinWindow(quote, today = beijingDate()) {
  if (!quote) return false
  const kind = quoteRecordKind(quote)
  if (kind === 'documented_transaction') return isWithinPastYear(quote.order_date, today)
  if ((quote.departure_date || '') < today) return isWithinPastYear(quote.departure_date, today)
  return true
}

function recentOrderDate(text, dates, fareIndex, today) {
  const contextStart = Math.max(0, fareIndex - 260)
  const contextEnd = Math.min(text.length, fareIndex + 180)
  const context = text.slice(contextStart, contextEnd)
  const orderTerms = /\b(?:ordered|booked|purchased|paid|payment\s+(?:made|completed|successful)|receipt\s+(?:issued|dated)|order\s+date|booking\s+date)\b|下单|订购|已付款|付款成功|支付成功|订单日期|预订日期|收据日期/ig
  const terms = [...context.matchAll(orderTerms)].map(item => contextStart + item.index)
  if (!terms.length) return null
  const candidates = dates
    .filter(date => date.explicit_year && isWithinPastYear(date.iso, today))
    .map(date => ({ date, distance: Math.min(...terms.map(index => Math.abs(index - date.index))) }))
    .filter(item => item.distance <= 80)
    .sort((a, b) => a.distance - b.distance)
  return candidates.length ? candidates[0].date.iso : null
}

function exactQuotes(text, route) {
  const upper = text.toUpperCase()
  if (!upper.includes('KUL') || !upper.includes(route.destination)) return []

  const dates = parseDates(text)
  const prices = parsePrices(text)
  const quotes = []
  const today = beijingDate()
  const latest = new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const oldest = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  for (let i = 0; i < dates.length; i++) {
    const departure = dates[i]
    const isHistorical = departure.iso < today
    if (departure.iso > latest || departure.iso < oldest || (isHistorical && !departure.explicit_year)) continue
    const next = dates[i + 1]
    const between = next ? text.slice(departure.end, next.index) : ''
    let returnDate = next && /^\s*[-–—]\s*$/.test(between) ? next.iso : null
    if (isHistorical && returnDate && next && !next.explicit_year) {
      const departureYear = Number(departure.iso.slice(0, 4))
      returnDate = `${departureYear}-${next.iso.slice(5)}`
      if (returnDate <= departure.iso) returnDate = `${departureYear + 1}-${next.iso.slice(5)}`
    }
    if (isHistorical && returnDate && returnDate >= today) continue
    const end = departure.index + 190
    const candidates = prices
      .filter(price => price.index >= departure.index && price.index <= end)
      .sort((a, b) => a.index - b.index)
    if (!candidates.length) continue
    const fare = candidates[0]
    const tripType = returnDate && returnDate > departure.iso ? 'round_trip' : 'one_way'
    const evidenceContext = text.slice(Math.max(0, fare.index - 120), Math.min(text.length, fare.index + 100))
    const orderDate = recentOrderDate(text, dates, fare.index, today)
    const hasPublicPaymentEvidence = Boolean(orderDate) && /(?:amount paid|total paid|payment successful|payment received|charged to|receipt|paid\s+(?:a total of\s+)?(?:RM|MYR)|booking confirmed|order confirmed|下单|已付款|付款成功|支付成功|订单确认)/i.test(evidenceContext)
    const recordKind = hasPublicPaymentEvidence
      ? 'documented_transaction'
      : isHistorical ? 'historical_public_quote' : 'public_quote'
    const quote = {
      origin: 'KUL',
      destination: route.destination,
      trip_type: tripType,
      departure_date: departure.iso,
      return_date: tripType === 'round_trip' ? returnDate : null,
      price: fare.amount,
      currency: 'MYR',
      airline: 'unknown',
      source: route.source,
      source_url: route.url,
      collected_at: today,
      observed_at: new Date().toISOString(),
      fare_type: recordKind,
      record_kind: recordKind,
      date_status: isHistorical ? 'past_departure' : 'upcoming_departure',
      order_date: hasPublicPaymentEvidence ? orderDate : null,
      transaction_evidence: hasPublicPaymentEvidence ? 'recent_order_or_payment_text_on_public_page' : null
    }
    if (!quotes.some(item => item.departure_date === quote.departure_date && item.return_date === quote.return_date && item.price === quote.price)) {
      quotes.push(quote)
    }
  }
  return quotes
}

async function hash(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function beijingDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date)
}

function dayShard(dateText) {
  const [year, month, day] = dateText.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000) % 7
}

function median(values) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function quantile(values, percentile) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const position = (sorted.length - 1) * percentile
  const low = Math.floor(position), high = Math.ceil(position)
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low)
}

function summarizeCloudQuotes(quotes, destination, tripType, generatedAt) {
  const today = beijingDate(new Date(generatedAt))
  const latestByItinerary = new Map()
  for (const quote of quotes || []) {
    if (!quote || quote.destination !== destination || quote.trip_type !== tripType || !/^\d{4}-\d{2}-\d{2}$/.test(quote.departure_date || '') || !Number.isFinite(Number(quote.price)) || !isQuoteWithinWindow(quote, today)) continue
    const identity = [quoteRecordKind(quote), quote.source_url || quote.source || 'unknown', destination, tripType, quote.departure_date, tripType === 'round_trip' ? (quote.return_date || '') : ''].join('|')
    const previous = latestByItinerary.get(identity)
    const timestamp = String(quote.last_seen_at || quote.observed_at || quote.last_seen || quote.collected_at || '')
    const previousTimestamp = previous ? String(previous.last_seen_at || previous.observed_at || previous.last_seen || previous.collected_at || '') : ''
    if (!previous || timestamp >= previousTimestamp) latestByItinerary.set(identity, quote)
  }
  const rows = [...latestByItinerary.values()]
  const recordTypeCounts = rows.reduce((counts, row) => {
    const type = quoteRecordKind(row)
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})
  const prices = rows.map(item => Number(item.price))
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekdayPrices = Array.from({ length: 7 }, () => [])
  for (const row of rows) {
    const day = new Date(`${row.departure_date}T00:00:00Z`).getUTCDay()
    weekdayPrices[(day + 6) % 7].push(Number(row.price))
  }
  const departureWeekday = {}
  for (let index = 0; index < weekdays.length; index++) {
    const day = weekdays[index]
    const dayPrices = weekdayPrices[index]
    departureWeekday[day] = {
      count: dayPrices.length,
      average: dayPrices.length ? Math.round((dayPrices.reduce((sum, value) => sum + value, 0) / dayPrices.length) * 100) / 100 : null,
      median: median(dayPrices)
    }
  }
  return {
    destination,
    origin: 'KUL',
    trip_type: tripType,
    generated_at: generatedAt,
    observation_count: rows.length,
    record_type_counts: recordTypeCounts,
    distinct_departure_dates: new Set(rows.map(item => item.departure_date)).size,
    source_count: new Set(rows.map(item => item.source).filter(Boolean)).size,
    currency: rows[0] ? rows[0].currency || 'MYR' : 'MYR',
    price_distribution: {
      count: prices.length,
      minimum: prices.length ? Math.min(...prices) : null,
      p10: quantile(prices, 0.1), p25: quantile(prices, 0.25), median: median(prices),
      p75: quantile(prices, 0.75), p90: quantile(prices, 0.9),
      maximum: prices.length ? Math.max(...prices) : null
    },
    departure_weekday: departureWeekday
  }
}

async function saveRouteAnalysis(env, destination, generatedAt) {
  const quotes = await env.PUBLIC_FARES.get(`quotes:${destination}`, 'json') || []
  for (const tripType of ['one_way', 'round_trip']) {
    const summary = summarizeCloudQuotes(quotes, destination, tripType, generatedAt)
    await env.PUBLIC_FARES.put(`analysis:${destination}:${tripType}`, JSON.stringify(summary))
  }
}

async function loadRankingObservations(env, tripType) {
  const destinations = [...new Set(SOURCES.map(source => source.destination))]
  const latestByItinerary = new Map()
  const today = beijingDate()
  const batchSize = 8
  for (let offset = 0; offset < destinations.length; offset += batchSize) {
    const batchDestinations = destinations.slice(offset, offset + batchSize)
    const quotesByDestination = await Promise.all(batchDestinations.map(destination => env.PUBLIC_FARES.get(`quotes:${destination}`, 'json')))
    batchDestinations.forEach((destination, index) => {
      for (const quote of quotesByDestination[index] || []) {
        if (!quote || quote.destination !== destination || quote.trip_type !== tripType || !/^\d{4}-\d{2}-\d{2}$/.test(quote.departure_date || '') || !Number.isFinite(Number(quote.price)) || !isQuoteWithinWindow(quote, today)) continue
        const identity = [quoteRecordKind(quote), quote.source_url || quote.source || 'unknown', destination, tripType, quote.departure_date, tripType === 'round_trip' ? (quote.return_date || '') : ''].join('|')
        const previous = latestByItinerary.get(identity)
        const timestamp = String(quote.last_seen_at || quote.observed_at || quote.last_seen || quote.collected_at || '')
        const previousTimestamp = previous ? String(previous.last_seen_at || previous.observed_at || previous.last_seen || previous.collected_at || '') : ''
        if (!previous || timestamp >= previousTimestamp) latestByItinerary.set(identity, quote)
      }
    })
  }
  return [...latestByItinerary.values()].map(quote => ({
    destination: quote.destination,
    trip_type: quote.trip_type,
    departure_date: quote.departure_date,
      return_date: quote.return_date || '',
    record_kind: quoteRecordKind(quote),
    source: quote.source || '',
    source_url: quote.source_url || ''
  }))
}

async function saveQuotes(env, route, found) {
  const key = `quotes:${route.destination}`
  const saved = await env.PUBLIC_FARES.get(key, 'json') || []
  const byIdentity = new Map(saved.map(item => [item.identity, item]))
  let added = 0
  let refreshed = 0

  for (const quote of found) {
    const identity = await hash([
      quoteRecordKind(quote), quote.source_url, quote.destination, quote.trip_type,
      quote.departure_date, quote.return_date || '', quote.price, quote.currency
    ].join('|'))
    const previous = byIdentity.get(identity)
    if (previous) {
      byIdentity.set(identity, { ...previous, ...quote, identity, last_seen: quote.collected_at, last_seen_at: quote.observed_at })
      refreshed += 1
    } else {
      byIdentity.set(identity, { ...quote, identity, last_seen: quote.collected_at, last_seen_at: quote.observed_at })
      added += 1
    }
  }

  const next = [...byIdentity.values()]
    .filter(item => isQuoteWithinWindow(item))
    .sort((a, b) => `${b.departure_date}|${b.collected_at}`.localeCompare(`${a.departure_date}|${a.collected_at}`))
    .slice(0, MAX_QUOTES_PER_ROUTE)
  await env.PUBLIC_FARES.put(key, JSON.stringify(next))
  return { added, refreshed }
}

async function fetchPublicPage(route) {
  const response = await fetch(route.url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Mozilla/5.0 (compatible; FlightDestinationPublicFareMonitor/1.0)'
    }
  })
  if (!response.ok) return { status: `http_${response.status}`, quotes: [] }
  const type = response.headers.get('content-type') || ''
  if (!type.toLowerCase().includes('text/html')) return { status: 'not_html', quotes: [] }
  const html = await response.text()
  const text = visibleText(html)
  if (/captcha|verify you are human|sign in to continue|log in to continue|access denied/i.test(text)) {
    return { status: 'blocked_or_login', quotes: [] }
  }
  return { status: 'ok', quotes: exactQuotes(text, route) }
}

async function runScheduled(env, scheduledTime) {
  const now = new Date(scheduledTime || Date.now())
  const today = beijingDate(now)
  const shard = dayShard(today)
  const chosen = SOURCES.filter((_, index) => index % 7 === shard)
  const analyzedDestinations = new Set()
  const result = {
    date: today,
    scheduled_at: now.toISOString(),
    timezone: 'Asia/Shanghai',
    shard,
    pages_attempted: 0,
    pages_skipped_recent: 0,
    pages_failed_or_blocked: 0,
    quotes_added: 0,
    quotes_seen_unchanged: 0
  }

  for (const route of chosen) {
    const pageKey = `page:${await hash(route.url)}`
    const previous = await env.PUBLIC_FARES.get(pageKey, 'json')
    if (previous && now.getTime() - previous.checked_at < REFRESH_INTERVAL_MS - 60 * 60 * 1000) {
      result.pages_skipped_recent += 1
      continue
    }
    result.pages_attempted += 1
    try {
      const fetched = await fetchPublicPage(route)
      if (fetched.status !== 'ok') {
        result.pages_failed_or_blocked += 1
      } else {
        const saved = await saveQuotes(env, route, fetched.quotes)
        result.quotes_added += saved.added
        result.quotes_seen_unchanged += saved.refreshed
        analyzedDestinations.add(route.destination)
      }
      await env.PUBLIC_FARES.put(pageKey, JSON.stringify({
        checked_at: now.getTime(), checked_at_iso: now.toISOString(), status: fetched.status,
        exact_fares_found: fetched.quotes.length, destination: route.destination
      }), { expirationTtl: 60 * 60 * 24 * 90 })
    } catch (error) {
      result.pages_failed_or_blocked += 1
      await env.PUBLIC_FARES.put(pageKey, JSON.stringify({
        checked_at: now.getTime(), checked_at_iso: now.toISOString(), status: 'fetch_error',
        message: String(error && error.message || error).slice(0, 160),
        destination: route.destination
      }), { expirationTtl: 60 * 60 * 24 * 90 })
    }
  }

  result.analysis_destinations_updated = 0
  result.analysis_snapshots_updated = 0
  result.analysis_failures = 0
  for (const destination of analyzedDestinations) {
    try {
      await saveRouteAnalysis(env, destination, now.toISOString())
      result.analysis_destinations_updated += 1
      result.analysis_snapshots_updated += 2
    } catch (error) {
      result.analysis_failures += 1
      console.error(`Could not save analysis snapshot for ${destination}`, error)
    }
  }

  await env.PUBLIC_FARES.put('run:last', JSON.stringify(result))
  await env.PUBLIC_FARES.put('run:next', JSON.stringify({
    scheduled_at: '16:00 UTC daily',
    local_time: '00:00 daily',
    timezone: 'Asia/Shanghai'
  }))
  return result
}

export default {
  async scheduled(controller, env, ctx) {
    if (!env.PUBLIC_FARES) {
      console.error('Missing required KV binding PUBLIC_FARES')
      return
    }
    ctx.waitUntil(runScheduled(env, controller.scheduledTime))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      })
    }
    if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405)
    if (!env.PUBLIC_FARES) {
      return jsonResponse({
        error: 'missing_kv_binding',
        message: 'Bind a Cloudflare Workers KV namespace as PUBLIC_FARES.'
      }, 503)
    }

    if (url.pathname === '/status.json') {
      const last = await env.PUBLIC_FARES.get('run:last', 'json')
      const next = await env.PUBLIC_FARES.get('run:next', 'json')
      return jsonResponse({ success: true, schedule: next, last_run: last })
    }

    if (url.pathname === '/public-fares.json') {
      const destination = (url.searchParams.get('destination') || '').toUpperCase()
      if (!/^[A-Z]{3}$/.test(destination)) return jsonResponse({ error: 'destination_required' }, 400)
      const today = beijingDate()
      const observations = (await env.PUBLIC_FARES.get(`quotes:${destination}`, 'json') || []).filter(item => isQuoteWithinWindow(item, today))
      const savedOneWay = await env.PUBLIC_FARES.get(`analysis:${destination}:one_way`, 'json')
      const savedRoundTrip = await env.PUBLIC_FARES.get(`analysis:${destination}:round_trip`, 'json')
      const analysis = {
        one_way: savedOneWay || summarizeCloudQuotes(observations, destination, 'one_way', new Date().toISOString()),
        round_trip: savedRoundTrip || summarizeCloudQuotes(observations, destination, 'round_trip', new Date().toISOString())
      }
      const destinationSources = SOURCES.filter(source => source.destination === destination)
      const sourceStatus = await Promise.all(destinationSources.map(async source => {
        const sourceKey = `page:${await hash(source.url)}`
        const state = await env.PUBLIC_FARES.get(sourceKey, 'json')
        return { source: source.source, source_url: source.url, status: state ? state.status : 'not_checked', last_checked_at: state ? (state.checked_at_iso || new Date(state.checked_at).toISOString()) : null, next_eligible_check_at: state ? new Date(state.checked_at + REFRESH_INTERVAL_MS).toISOString() : null }
      }))
      return jsonResponse({
        success: true,
        origin: 'KUL',
        destination,
        timezone: 'Asia/Shanghai',
        observations,
        analysis,
        source_status: sourceStatus,
        refresh_policy: { scheduled_time: '00:00 Asia/Shanghai daily', per_page_interval_days: 7 }
      })
    }

    if (url.pathname === '/rankings.json') {
      const tripType = url.searchParams.get('trip_type') === 'round_trip' ? 'round_trip' : 'one_way'
      const observations = await loadRankingObservations(env, tripType)
      return new Response(JSON.stringify({ success: true, trip_type: tripType, observations }), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*'
        }
      })
    }

    return jsonResponse({
      success: true,
      service: 'public-page-fare-collector',
      schedule: 'daily 00:00 Asia/Shanghai',
      sources: SOURCES.length,
      message: 'Only public HTML pages are fetched; no airfare APIs are used.'
    })
  }
}
