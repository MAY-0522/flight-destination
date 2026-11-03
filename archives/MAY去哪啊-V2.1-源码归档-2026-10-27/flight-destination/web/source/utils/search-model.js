// utils/search-model.js
//
// 统一搜索数据模型
// 用于：
// 1. Search Params
// 2. Search Task
// 3. Flight Result
// 4. Price Cache
//
// 当前阶段只建立统一模型。
// 不主动修改现有页面逻辑，避免影响已经跑通的真实搜索流程。

/* =========================================================
 * 1. Search Task Status
 * ======================================================= */

const SEARCH_STATUS = {
  IDLE: 'IDLE',

  SEARCHING: 'SEARCHING',

  SUCCESS: 'SUCCESS',

  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',

  ALL_FAILED: 'ALL_FAILED',

  TIMEOUT: 'TIMEOUT',

  CANCELLED: 'CANCELLED',

  RETRYING: 'RETRYING'
}


/* =========================================================
 * 2. Refresh Status
 * ======================================================= */

const REFRESH_STATUS = {
  IDLE: 'IDLE',

  REFRESHING: 'REFRESHING',

  SUCCESS: 'SUCCESS',

  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',

  FAILED: 'FAILED',

  TIMEOUT: 'TIMEOUT'
}


/* =========================================================
 * 3. Price Status
 * ======================================================= */

const PRICE_STATUS = {
  FRESH: 'FRESH',

  STALE: 'STALE',

  UPDATING: 'UPDATING',

  FAILED: 'FAILED'
}


/* =========================================================
 * 4. Search Params
 * ======================================================= */

/**
 * 创建统一 Search Params
 *
 * @param {Object} params
 * @returns {Object}
 */
function createSearchParams(params = {}) {
  const origin = params.origin || {
    city: '吉隆坡',
    airport: 'KUL',
    airportName: 'Kuala Lumpur International Airport'
  }

  const tripType =
    params.tripType === 'oneway'
      ? 'oneway'
      : 'round'

  const minDuration =
    params.minDuration !== undefined &&
    params.minDuration !== null
      ? Number(params.minDuration)
      : null

  const maxDuration =
    params.maxDuration !== undefined &&
    params.maxDuration !== null
      ? Number(params.maxDuration)
      : null

  const budget =
    params.budget !== undefined &&
    params.budget !== null
      ? Number(params.budget)
      : null

  return {
    origin,

    departureDate:
      params.departureDate || '',

    tripType,

    minDuration:
      tripType === 'round'
        ? minDuration
        : null,

    maxDuration:
      tripType === 'round'
        ? maxDuration
        : null,

    budgetSet:
      Boolean(params.budgetSet),

    unlimitedBudget:
      Boolean(params.unlimitedBudget),

    budget,

    excludedDestinations:
      Array.isArray(params.excludedDestinations)
        ? [...params.excludedDestinations]
        : [],

    excludedDestinationNames:
      Array.isArray(params.excludedDestinationNames)
        ? [...params.excludedDestinationNames]
        : [],

    region:
      params.region || 'Southeast Asia',

    directOnly:
      params.directOnly !== false,

    mode:
      params.mode || 'real'
  }
}


/* =========================================================
 * 5. Flight Result
 * ======================================================= */

/**
 * 创建统一 Flight Result
 *
 * @param {Object} result
 * @returns {Object}
 */
function createFlightResult(result = {}) {
  const price =
    result.price !== undefined &&
    result.price !== null
      ? Number(result.price)
      : null

  const duration =
    result.duration !== undefined &&
    result.duration !== null
      ? Number(result.duration)
      : null

  const stops =
    result.stops !== undefined &&
    result.stops !== null
      ? Number(result.stops)
      : 0

  return {
    destinationCode:
      result.destinationCode ||
      result.destination ||
      '',

    destinationName:
      result.destinationName ||
      result.city ||
      result.destination ||
      '',

    city:
      result.city ||
      result.destinationName ||
      result.destination ||
      '',

    country:
      result.country ||
      '',

    countryCode:
      result.countryCode ||
      '',

    departureDate:
      result.departureDate ||
      '',

    returnDate:
      result.returnDate ||
      null,

    duration,

    price,

    currency:
      result.currency ||
      'CNY',

    airline:
      result.airline ||
      '',

    airlineLogo:
      result.airlineLogo ||
      '',

    totalDuration:
      result.totalDuration !== undefined &&
      result.totalDuration !== null
        ? Number(result.totalDuration)
        : null,

    stops,

    departure:
      result.departure ||
      null,

    arrival:
      result.arrival ||
      null,

    segments:
      Array.isArray(result.segments)
        ? result.segments
        : [],

    fetchedAt:
      result.fetchedAt ||
      Date.now()
  }
}


/* =========================================================
 * 6. Search Task
 * ======================================================= */

/**
 * 创建统一 Search Task
 *
 * @param {Object} params
 * @returns {Object}
 */
function createSearchTask(params = {}) {
  const taskId =
    params.taskId ||
    generateTaskId('search')

  const searchParams =
    createSearchParams(
      params.searchParams || params
    )

  return {
    taskId,

    status:
      params.status ||
      SEARCH_STATUS.SEARCHING,

    createdAt:
      params.createdAt ||
      Date.now(),

    startedAt:
      params.startedAt ||
      Date.now(),

    finishedAt:
      params.finishedAt ||
      null,

    searchParams,

    results:
      Array.isArray(params.results)
        ? params.results.map(createFlightResult)
        : [],

    failedResults:
      Array.isArray(params.failedResults)
        ? [...params.failedResults]
        : [],

    total:
      Number(params.total || 0),

    successCount:
      Number(params.successCount || 0),

    failedCount:
      Number(params.failedCount || 0),

    error:
      params.error ||
      null
  }
}


/* =========================================================
 * 7. Search Task Result Update
 * ======================================================= */

/**
 * 根据最终查询结果更新 Search Task
 *
 * @param {Object} task
 * @param {Array} successfulResults
 * @param {Array} failedResults
 * @returns {Object}
 */
function finalizeSearchTask(
  task,
  successfulResults = [],
  failedResults = []
) {
  const normalizedResults =
    successfulResults.map(createFlightResult)

  const normalizedFailedResults =
    Array.isArray(failedResults)
      ? [...failedResults]
      : []

  const total =
    normalizedResults.length +
    normalizedFailedResults.length

  let status

  if (total === 0) {
    status =
      SEARCH_STATUS.ALL_FAILED
  } else if (
    normalizedResults.length === 0
  ) {
    status =
      SEARCH_STATUS.ALL_FAILED
  } else if (
    normalizedFailedResults.length > 0
  ) {
    status =
      SEARCH_STATUS.PARTIAL_SUCCESS
  } else {
    status =
      SEARCH_STATUS.SUCCESS
  }

  return {
    ...task,

    status,

    finishedAt:
      Date.now(),

    results:
      normalizedResults,

    failedResults:
      normalizedFailedResults,

    total,

    successCount:
      normalizedResults.length,

    failedCount:
      normalizedFailedResults.length
  }
}


/* =========================================================
 * 8. Price Cache
 * ======================================================= */

/**
 * 创建统一价格缓存
 *
 * @param {Array} results
 * @returns {Object}
 */
function createPriceCache(results = []) {
  const normalizedResults =
    Array.isArray(results)
      ? results.map(createFlightResult)
      : []

  return {
    results:
      normalizedResults,

    updatedAt:
      Date.now(),

    status:
      PRICE_STATUS.FRESH
  }
}


/**
 * 判断缓存是否过期
 *
 * 默认 15 分钟
 *
 * @param {Object} cache
 * @param {Number} duration
 * @returns {Boolean}
 */
function isPriceCacheStale(
  cache,
  duration = 15 * 60 * 1000
) {
  if (!cache) {
    return true
  }

  if (!cache.updatedAt) {
    return true
  }

  return (
    Date.now() - cache.updatedAt >
    duration
  )
}


/* =========================================================
 * 9. Refresh Result
 * ======================================================= */

/**
 * 创建刷新状态
 *
 * @param {Object} params
 * @returns {Object}
 */
function createRefreshState(params = {}) {
  return {
    status:
      params.status ||
      REFRESH_STATUS.IDLE,

    requestId:
      params.requestId ||
      null,

    startedAt:
      params.startedAt ||
      null,

    finishedAt:
      params.finishedAt ||
      null,

    successCount:
      Number(params.successCount || 0),

    failedCount:
      Number(params.failedCount || 0),

    failedDestinations:
      Array.isArray(params.failedDestinations)
        ? [...params.failedDestinations]
        : [],

    error:
      params.error ||
      null
  }
}


/* =========================================================
 * 10. Generate ID
 * ======================================================= */

function generateTaskId(prefix = 'task') {
  return (
    prefix +
    '_' +
    Date.now() +
    '_' +
    Math.random()
      .toString(36)
      .slice(2, 8)
  )
}


/* =========================================================
 * 11. Clone
 * ======================================================= */

function cloneData(data) {
  if (data === undefined || data === null) {
    return data
  }

  return JSON.parse(
    JSON.stringify(data)
  )
}


/* =========================================================
 * 12. Module Exports
 * ======================================================= */

module.exports = {

  SEARCH_STATUS,

  REFRESH_STATUS,

  PRICE_STATUS,

  createSearchParams,

  createFlightResult,

  createSearchTask,

  finalizeSearchTask,

  createPriceCache,

  isPriceCacheStale,

  createRefreshState,

  generateTaskId,

  cloneData

}