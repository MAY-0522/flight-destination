// utils/flight-model.js

/**
 * ============================================================
 * Flight Result Unified Data Model
 * ============================================================
 *
 * 所有真实航班数据最终统一成下面的结构：
 *
 * {
 *   destination,
 *   destinationCode,
 *   destinationName,
 *   country,
 *   city,
 *
 *   departureDate,
 *   returnDate,
 *   duration,
 *
 *   price,
 *   currency,
 *
 *   airline,
 *   airlineLogo,
 *
 *   totalDuration,
 *   stops,
 *
 *   departure,
 *   arrival,
 *   segments,
 *
 *   source,
 *   directOnly,
 *   fetchedAt
 * }
 *
 * 后续：
 * SerpApi
 * Worker
 * flight-api
 * cache
 * refresh
 *
 * 都统一进入这个模型。
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * 安全数字转换
 * ------------------------------------------------------------
 */
function toNumber(value, fallback = null) {

  const number =
    Number(value)

  if (
    Number.isFinite(number)
  ) {

    return number
  }

  return fallback
}


/**
 * ------------------------------------------------------------
 * 安全字符串
 * ------------------------------------------------------------
 */
function toStringValue(
  value,
  fallback = ''
) {

  if (
    value === null ||
    value === undefined
  ) {

    return fallback
  }

  return String(value)
}


/**
 * ------------------------------------------------------------
 * 规范化航段
 * ------------------------------------------------------------
 */
function normalizeSegment(
  segment
) {

  if (!segment) {

    return null
  }


  return {

    airline:
      toStringValue(
        segment.airline
      ),

    airlineLogo:
      toStringValue(
        segment.airlineLogo
      ),

    flightNumber:
      toStringValue(
        segment.flightNumber
      ),

    airplane:
      toStringValue(
        segment.airplane
      ),

    duration:
      toNumber(
        segment.duration
      ),

    departure:
      normalizeAirportPoint(
        segment.departure
      ),

    arrival:
      normalizeAirportPoint(
        segment.arrival
      )
  }
}


/**
 * ------------------------------------------------------------
 * 规范化机场时间点
 * ------------------------------------------------------------
 */
function normalizeAirportPoint(
  point
) {

  if (!point) {

    return null
  }


  return {

    airport:
      toStringValue(
        point.airport
      ),

    airportName:
      toStringValue(
        point.airportName
      ),

    time:
      toStringValue(
        point.time
      )
  }
}


/**
 * ------------------------------------------------------------
 * 规范化航段数组
 * ------------------------------------------------------------
 */
function normalizeSegments(
  segments
) {

  if (
    !Array.isArray(
      segments
    )
  ) {

    return []
  }


  return segments

    .map(
      segment =>
        normalizeSegment(
          segment
        )
    )

    .filter(
      Boolean
    )
}


/**
 * ------------------------------------------------------------
 * 规范化 Flight Result
 * ------------------------------------------------------------
 */
function normalizeFlightResult(
  result,
  extra = {}
) {

  if (!result) {

    return null
  }


  const normalized = {

    // --------------------------------------------------------
    // Destination
    // --------------------------------------------------------

    destination:
      toStringValue(
        result.destination
      ),

    destinationCode:
      toStringValue(
        result.destinationCode
      ).toUpperCase(),

    destinationName:
      toStringValue(
        result.destinationName ||
        result.city ||
        result.destination
      ),

    country:
      toStringValue(
        result.country
      ),

    city:
      toStringValue(
        result.city ||
        result.destinationName
      ),


    // --------------------------------------------------------
    // Date / Duration
    // --------------------------------------------------------

    departureDate:
      toStringValue(
        result.departureDate
      ),

    returnDate:
      result.returnDate
        ? toStringValue(
            result.returnDate
          )
        : null,

    duration:
      result.duration !== null &&
      result.duration !== undefined
        ? toNumber(
            result.duration
          )
        : null,


    // --------------------------------------------------------
    // Price
    // --------------------------------------------------------

    price:
      toNumber(
        result.price
      ),

    currency:
      toStringValue(
        result.currency,
        'CNY'
      ),


    // --------------------------------------------------------
    // Airline
    // --------------------------------------------------------

    airline:
      toStringValue(
        result.airline
      ),

    airlineLogo:
      toStringValue(
        result.airlineLogo
      ),


    // --------------------------------------------------------
    // Flight information
    // --------------------------------------------------------

    totalDuration:
      toNumber(
        result.totalDuration
      ),

    stops:
      toNumber(
        result.stops,
        0
      ),


    // --------------------------------------------------------
    // Departure / Arrival
    // --------------------------------------------------------

    departure:
      normalizeAirportPoint(
        result.departure
      ),

    arrival:
      normalizeAirportPoint(
        result.arrival
      ),


    // --------------------------------------------------------
    // Segments
    // --------------------------------------------------------

    segments:
      normalizeSegments(
        result.segments
      ),


    // --------------------------------------------------------
    // Data source
    // --------------------------------------------------------

    source:
      toStringValue(
        result.source ||
        extra.source ||
        'unknown'
      ),

    directOnly:
      result.directOnly !== undefined
        ? Boolean(
            result.directOnly
          )
        : Boolean(
            extra.directOnly
          ),


    // --------------------------------------------------------
    // Timestamp
    // --------------------------------------------------------

    fetchedAt:
      result.fetchedAt ||
      extra.fetchedAt ||
      Date.now()
  }


  return normalized
}


/**
 * ------------------------------------------------------------
 * 批量规范化
 * ------------------------------------------------------------
 */
function normalizeFlightResults(
  results,
  extra = {}
) {

  if (
    !Array.isArray(
      results
    )
  ) {

    return []
  }


  return results

    .map(
      result =>
        normalizeFlightResult(
          result,
          extra
        )
    )

    .filter(
      Boolean
    )
}


/**
 * ------------------------------------------------------------
 * 验证 Flight Result
 * ------------------------------------------------------------
 *
 * 注意：
 * 这里不是判断“航班一定存在”。
 * 只是判断这个对象是否已经满足统一数据模型的基本要求。
 * ------------------------------------------------------------
 */
function isValidFlightResult(
  result
) {

  if (!result) {

    return false
  }


  if (
    !result.destinationCode
  ) {

    return false
  }


  if (
    !result.departureDate
  ) {

    return false
  }


  if (
    result.price === null ||
    result.price === undefined ||
    !Number.isFinite(
      Number(result.price)
    )
  ) {

    return false
  }


  return true
}


/**
 * ------------------------------------------------------------
 * 按价格排序
 * ------------------------------------------------------------
 */
function sortFlightsByPrice(
  results
) {

  if (
    !Array.isArray(
      results
    )
  ) {

    return []
  }


  return [...results].sort(
    (a, b) => {

      const priceA =
        Number.isFinite(
          Number(a.price)
        )
          ? Number(a.price)
          : Infinity

      const priceB =
        Number.isFinite(
          Number(b.price)
        )
          ? Number(b.price)
          : Infinity


      return priceA - priceB
    }
  )
}


/**
 * ------------------------------------------------------------
 * 获取最低价格结果
 * ------------------------------------------------------------
 */
function getLowestPriceResult(
  results
) {

  const validResults =
    normalizeFlightResults(
      results
    ).filter(
      isValidFlightResult
    )


  if (
    validResults.length === 0
  ) {

    return null
  }


  const sorted =
    sortFlightsByPrice(
      validResults
    )


  return sorted[0]
}


/**
 * ------------------------------------------------------------
 * 创建目的地级结果
 * ------------------------------------------------------------
 *
 * 这个函数用于：
 *
 * 一个目的地
 * +
 * 多个日期
 * +
 * 多个航班
 *
 * 最终选出最低价的一条。
 * ------------------------------------------------------------
 */
function createDestinationResult(
  result,
  destination = {}
) {

  const normalized =
    normalizeFlightResult(
      result,
      {
        source:
          result &&
          result.source
            ? result.source
            : 'serpapi',

        directOnly:
          result &&
          result.directOnly !== undefined
            ? result.directOnly
            : true
      }
    )


  if (!normalized) {

    return null
  }


  return {

    ...normalized,

    destinationCode:
      destination.code ||
      normalized.destinationCode,

    destinationName:
      destination.name ||
      normalized.destinationName,

    country:
      destination.country ||
      normalized.country,

    city:
      destination.name ||
      normalized.city
  }
}


/**
 * ------------------------------------------------------------
 * 模型版本
 * ------------------------------------------------------------
 */
/**
 * ------------------------------------------------------------
 * 判断单个航班是否符合搜索预算
 * ------------------------------------------------------------
 *
 * 规则：
 *
 * 1. budgetSet = false
 *    → 不进行预算限制
 *
 * 2. unlimitedBudget = true
 *    → 不进行预算限制
 *
 * 3. budgetSet = true
 *    且 unlimitedBudget = false
 *    → price 必须 <= budget
 * ------------------------------------------------------------
 */
function isWithinBudget(
  result,
  searchParams
) {

  if (!result) {
    return false
  }


  if (!searchParams) {
    return true
  }


  // 未设置预算
  if (
    searchParams.budgetSet !== true
  ) {

    return true
  }


  // 用户选择不限预算
  if (
    searchParams.unlimitedBudget === true
  ) {

    return true
  }


  const budget =
    Number(
      searchParams.budget
    )


  // 搜索参数异常时，不进行错误过滤
  if (
    !Number.isFinite(
      budget
    )
  ) {

    return true
  }


  const price =
    Number(
      result.price
    )


  // 没有合法价格 → 不能进入结果
  if (
    !Number.isFinite(
      price
    )
  ) {

    return false
  }


  return price <= budget
}


/**
 * ------------------------------------------------------------
 * 根据 Search Params 过滤 Flight Results
 * ------------------------------------------------------------
 */
function filterFlightResultsBySearchParams(
  results,
  searchParams
) {

  if (
    !Array.isArray(
      results
    )
  ) {

    return []
  }


  return results.filter(
    result =>
      isWithinBudget(
        result,
        searchParams
      )
  )
}

const FLIGHT_MODEL_VERSION =
  '1.0.0'


/**
 * ------------------------------------------------------------
 * Export
 * ------------------------------------------------------------
 */
module.exports = {

  FLIGHT_MODEL_VERSION,

  normalizeAirportPoint,

  normalizeSegment,

  normalizeSegments,

  normalizeFlightResult,

  normalizeFlightResults,

  isValidFlightResult,

  sortFlightsByPrice,

  getLowestPriceResult,

  createDestinationResult,

  isWithinBudget,

  filterFlightResultsBySearchParams
}