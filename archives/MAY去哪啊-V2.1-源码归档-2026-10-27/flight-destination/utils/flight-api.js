const PUBLIC_FARES_URL = 'https://flight-destination-api.xu5lu2yi2.workers.dev'

function requestPublicFares(destination) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${PUBLIC_FARES_URL}/public-fares.json?destination=${encodeURIComponent(String(destination || '').toUpperCase())}`,
      method: 'GET',
      timeout: 12000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.success && Array.isArray(response.data.observations)) {
          resolve(response.data.observations)
          return
        }
        reject({ type: 'PUBLIC_REPORT_ERROR', statusCode: response.statusCode, data: response.data })
      },
      fail(error) {
        reject({ type: 'NETWORK_ERROR', error })
      }
    })
  })
}

function resultFromQuote(quote, destination, departureDate, returnDate, duration) {
  return {
    status: 'SUCCESS',
    destination: String(destination).toUpperCase(),
    departureDate,
    returnDate: returnDate || null,
    duration: duration == null ? null : duration,
    price: Number(quote.price),
    currency: quote.currency || 'MYR',
    airline: quote.airline || 'unknown',
    airlineLogo: '',
    totalDuration: null,
    stops: null,
    departure: null,
    arrival: null,
    segments: [],
    source: quote.source || 'Public website',
    sourceUrl: quote.source_url || '',
    collectedAt: quote.collected_at || quote.last_seen || ''
  }
}

async function searchOneWay(destination, departureDate) {
  const observations = await requestPublicFares(destination)
  const matches = observations
    .filter(item => item.trip_type === 'one_way' && item.departure_date === departureDate && Number(item.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))

  if (!matches.length) {
    return {
      status: 'NO_RESULTS',
      destination: String(destination).toUpperCase(),
      departureDate,
      returnDate: null,
      duration: null
    }
  }

  return resultFromQuote(matches[0], destination, departureDate, null, null)
}

function dateDistanceInclusive(departureDate, returnDate) {
  const start = new Date(`${departureDate}T00:00:00Z`)
  const end = new Date(`${returnDate}T00:00:00Z`)
  const distance = Math.round((end.getTime() - start.getTime()) / 86400000)
  return distance >= 0 ? distance + 1 : null
}

async function searchRoundTrip(destination, departureDate, minDuration, maxDuration) {
  const observations = await requestPublicFares(destination)
  const minimum = Math.max(1, Number(minDuration) || 1)
  const maximum = Math.max(minimum, Number(maxDuration) || minimum)
  const matches = observations
    .filter(item => {
      if (item.trip_type !== 'round_trip' || item.departure_date !== departureDate || !item.return_date || Number(item.price) <= 0) return false
      const duration = dateDistanceInclusive(departureDate, item.return_date)
      return duration !== null && duration >= minimum && duration <= maximum
    })
    .sort((a, b) => Number(a.price) - Number(b.price))

  if (!matches.length) {
    return {
      status: 'NO_RESULTS',
      destination: String(destination).toUpperCase(),
      departureDate,
      returnDate: null,
      duration: null
    }
  }

  const quote = matches[0]
  return resultFromQuote(
    quote,
    destination,
    departureDate,
    quote.return_date,
    dateDistanceInclusive(departureDate, quote.return_date)
  )
}

async function searchDestination(destination, searchParams) {
  if (!destination) throw new Error('缺少 destination')
  if (!searchParams || !searchParams.departureDate) throw new Error('缺少 departureDate')

  if (searchParams.tripType === 'round') {
    return searchRoundTrip(
      destination,
      searchParams.departureDate,
      Number(searchParams.minDuration),
      Number(searchParams.maxDuration)
    )
  }

  return searchOneWay(destination, searchParams.departureDate)
}

async function searchDestinations(destinations, searchParams) {
  const results = []
  const failedDestinations = []
  const noResultDestinations = []

  await Promise.all((destinations || []).map(async destination => {
    try {
      const result = await searchDestination(destination.code, searchParams)
      if (!result || result.status === 'NO_RESULTS') {
        noResultDestinations.push(destination)
        return
      }
      results.push({
        ...result,
        destinationCode: destination.code,
        destinationName: destination.name,
        country: destination.country,
        city: destination.name
      })
    } catch (error) {
      console.error(`[public-fares] ${destination.name} report lookup failed`, error)
      failedDestinations.push(destination)
    }
  }))

  results.sort((a, b) => a.price - b.price)
  return { results, failedDestinations, noResultDestinations }
}

module.exports = {
  requestPublicFares,
  searchOneWay,
  searchRoundTrip,
  searchDestination,
  searchDestinations
}
