// ================================
// Mock Flight API
// 用于模拟真实机票 API
// ================================

const MOCK_FLIGHTS = [
  {
    id: 'vietnam-ho-chi-minh',
    destination: '胡志明市',
    country: '越南',
    airport: 'SGN',
    price: 680,
    tripDuration: 3,
    outbound: 'KUL → SGN',
    inbound: 'SGN → KUL',
    airline: 'Vietnam Airlines'
  },
  {
    id: 'thailand-bangkok',
    destination: '曼谷',
    country: '泰国',
    airport: 'BKK',
    price: 720,
    tripDuration: 4,
    outbound: 'KUL → BKK',
    inbound: 'BKK → KUL',
    airline: 'Thai Airways'
  },
  {
    id: 'singapore',
    destination: '新加坡',
    country: '新加坡',
    airport: 'SIN',
    price: 790,
    tripDuration: 3,
    outbound: 'KUL → SIN',
    inbound: 'SIN → KUL',
    airline: 'Scoot'
  },
  {
    id: 'indonesia-bali',
    destination: '巴厘岛',
    country: '印度尼西亚',
    airport: 'DPS',
    price: 890,
    tripDuration: 4,
    outbound: 'KUL → DPS',
    inbound: 'DPS → KUL',
    airline: 'AirAsia'
  },
  {
    id: 'philippines-manila',
    destination: '马尼拉',
    country: '菲律宾',
    airport: 'MNL',
    price: 960,
    tripDuration: 4,
    outbound: 'KUL → MNL',
    inbound: 'MNL → KUL',
    airline: 'Philippine Airlines'
  }
]

/**
 * 查询单个目的地
 *
 * scenario:
 * normal  = 全部成功
 * partial = 部分失败
 * allFail = 全部失败
 */
function queryDestination(destination, scenario = 'normal') {
  return new Promise((resolve, reject) => {

    const delay =
      400 +
      Math.floor(Math.random() * 700)

    setTimeout(() => {

      // 全部失败
      if (scenario === 'allFail') {
        reject({
          code: 'MOCK_API_ERROR',
          message: 'Mock API 请求失败',
          destination: destination.destination
        })

        return
      }

      // 部分失败
      if (
        scenario === 'partial' &&
        (
          destination.destination === '巴厘岛' ||
          destination.destination === '曼谷'
        )
      ) {
        reject({
          code: 'MOCK_API_ERROR',
          message: '该目的地暂时无法获取价格',
          destination: destination.destination
        })

        return
      }

      // 正常成功
      resolve({
        ...destination,
        updatedAt: formatTime(),
        source: 'Mock Flight API'
      })

    }, delay)
  })
}

/**
 * 查询全部目的地
 */
function searchFlights(searchParams) {

  const scenario =
    wx.getStorageSync('mockSearchScenario') ||
    'normal'

  const destinations =
    getAvailableDestinations(searchParams)

  console.log(
    'Mock API 搜索模式:',
    scenario
  )

  console.log(
    'Mock API 查询目的地:',
    destinations
  )

  const requests =
    destinations.map(destination => {
      return queryDestination(
        destination,
        scenario
      )
        .then(result => ({
          success: true,
          data: result
        }))
        .catch(error => ({
          success: false,
          error
        }))
    })

  return Promise.all(requests)
}

/**
 * 根据搜索条件确定需要查询的目的地
 */
function getAvailableDestinations(searchParams) {

  const countryMap = {
    singapore: '新加坡',
    thailand: '泰国',
    malaysia: '马来西亚',
    indonesia: '印度尼西亚',
    vietnam: '越南',
    philippines: '菲律宾',
    cambodia: '柬埔寨'
  }

  const excluded =
    searchParams.excludedDestinations || []

  const excludedCountries = []

  const excludedCities = []

  excluded.forEach(id => {

    if (countryMap[id]) {
      excludedCountries.push(
        countryMap[id]
      )
    } else {
      const destination =
        findDestinationById(id)

      if (destination) {
        excludedCities.push(
          destination.destination
        )
      }
    }
  })

  return MOCK_FLIGHTS.filter(item => {

    // 国家排除
    if (
      excludedCountries.includes(
        item.country
      )
    ) {
      return false
    }

    // 城市排除
    if (
      excludedCities.includes(
        item.destination
      )
    ) {
      return false
    }

    return true
  })
}

/**
 * 根据 ID 查找目的地
 */
function findDestinationById(id) {

  const map = {
    'singapore-city': '新加坡',
    'thailand-bangkok': '曼谷',
    'thailand-phuket': '普吉岛',
    'thailand-chiang-mai': '清迈',
    'indonesia-bali': '巴厘岛',
    'indonesia-jakarta': '雅加达',
    'vietnam-ho-chi-minh': '胡志明市',
    'vietnam-hanoi': '河内',
    'philippines-manila': '马尼拉',
    'philippines-cebu': '宿务',
    'cambodia-phnom-penh': '金边',
    'cambodia-siem-reap': '暹粒'
  }

  const city =
    map[id]

  if (!city) {
    return null
  }

  return {
    destination: city
  }
}

/**
 * 格式化更新时间
 */
function formatTime() {

  const date = new Date()

  const hour =
    String(date.getHours())
      .padStart(2, '0')

  const minute =
    String(date.getMinutes())
      .padStart(2, '0')

  return `${hour}:${minute}`
}

module.exports = {
  searchFlights
}