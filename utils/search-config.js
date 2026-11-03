// utils/search-config.js

/**
 * ========================================
 * 搜索参数统一数据模型
 * ========================================
 *
 * 所有页面之间传递的搜索条件，都应该遵循
 * 这里定义的数据结构。
 *
 * 当前版本只负责：
 * 1. 定义默认搜索参数
 * 2. 创建标准 Search Params
 * 3. 规范化已有 Search Params
 * 4. 提供常用判断方法
 *
 * 暂时不改变任何现有业务逻辑。
 */

// ========================================
// 固定搜索配置
// ========================================

const SEARCH_CONFIG = {

  // 固定出发机场
  ORIGIN: {
    city: '吉隆坡',
    airport: 'KUL',
    airportName:
      'Kuala Lumpur International Airport'
  },

  // 当前 MVP 区域
  REGION:
    'Southeast Asia',

  // 当前 MVP 只支持直飞
  DIRECT_ONLY:
    true,

  // 当前价格统一使用人民币
  CURRENCY:
    'CNY',

  // 当前产品默认旅行人数
  ADULTS:
    1,

  CHILDREN:
    0,

  INFANTS:
    0,

  // 往返默认时长
  DEFAULT_MIN_DURATION:
    3,

  DEFAULT_MAX_DURATION:
    7,

  // 默认搜索方式
  DEFAULT_TRIP_TYPE:
    'round',

  // 当前真实数据模式
  DEFAULT_MODE:
    'real',

  // 搜索超时时间
  SEARCH_TIMEOUT:
    30000,

  // 价格缓存时间
  PRICE_CACHE_DURATION:
    15 * 60 * 1000
}


// ========================================
// 创建默认搜索参数
// ========================================

function getDefaultSearchParams() {

  return {

    // ------------------------------------
    // 出发信息
    // ------------------------------------

    origin: {
      ...SEARCH_CONFIG.ORIGIN
    },

    // ------------------------------------
    // 日期
    // ------------------------------------

    departureDate: '',

    // ------------------------------------
    // 行程类型
    // round / oneway
    // ------------------------------------

    tripType:
      SEARCH_CONFIG.DEFAULT_TRIP_TYPE,

    // ------------------------------------
    // 往返时长
    // ------------------------------------

    minDuration:
      SEARCH_CONFIG.DEFAULT_MIN_DURATION,

    maxDuration:
      SEARCH_CONFIG.DEFAULT_MAX_DURATION,

    // ------------------------------------
    // 预算
    // ------------------------------------

    budgetSet:
      false,

    unlimitedBudget:
      false,

    budget:
      null,

    // ------------------------------------
    // 排除目的地
    // ------------------------------------

    excludedDestinations:
      [],

    excludedDestinationNames:
      [],

    // ------------------------------------
    // 产品范围
    // ------------------------------------

    region:
      SEARCH_CONFIG.REGION,

    directOnly:
      SEARCH_CONFIG.DIRECT_ONLY,

    // ------------------------------------
    // 人数
    // ------------------------------------

    adults:
      SEARCH_CONFIG.ADULTS,

    children:
      SEARCH_CONFIG.CHILDREN,

    infants:
      SEARCH_CONFIG.INFANTS,

    // ------------------------------------
    // 货币
    // ------------------------------------

    currency:
      SEARCH_CONFIG.CURRENCY,

    // ------------------------------------
    // 数据模式
    // ------------------------------------

    mode:
      SEARCH_CONFIG.DEFAULT_MODE
  }
}


// ========================================
// 创建标准 Search Params
// ========================================
//
// 用法：
//
// const params = createSearchParams({
//   departureDate: '2026-10-23',
//   tripType: 'round',
//   minDuration: 3,
//   maxDuration: 7
// })
//
// ========================================

function createSearchParams(input) {

  const defaults =
    getDefaultSearchParams()

  const source =
    input || {}

  const params = {

    ...defaults,

    ...source,

    origin: {
      ...defaults.origin,
      ...(source.origin || {})
    },

    excludedDestinations:
      Array.isArray(
        source.excludedDestinations
      )
        ? [...source.excludedDestinations]
        : [],

    excludedDestinationNames:
      Array.isArray(
        source.excludedDestinationNames
      )
        ? [...source.excludedDestinationNames]
        : []
  }

  // ------------------------------------
  // 数值统一
  // ------------------------------------

  params.minDuration =
    Number(params.minDuration)

  params.maxDuration =
    Number(params.maxDuration)

  if (
    params.budget !== null &&
    params.budget !== '' &&
    params.budget !== undefined
  ) {

    params.budget =
      Number(params.budget)

  } else {

    params.budget =
      null
  }

  // ------------------------------------
  // Boolean 统一
  // ------------------------------------

  params.budgetSet =
    Boolean(params.budgetSet)

  params.unlimitedBudget =
    Boolean(params.unlimitedBudget)

  params.directOnly =
    Boolean(params.directOnly)

  // ------------------------------------
  // 人数统一
  // ------------------------------------

  params.adults =
    Number(params.adults) || 1

  params.children =
    Number(params.children) || 0

  params.infants =
    Number(params.infants) || 0

  // ------------------------------------
  // 字符串统一
  // ------------------------------------

  params.tripType =
    params.tripType === 'oneway'
      ? 'oneway'
      : 'round'

  params.region =
    params.region ||
    SEARCH_CONFIG.REGION

  params.currency =
    params.currency ||
    SEARCH_CONFIG.CURRENCY

  params.mode =
    params.mode ||
    SEARCH_CONFIG.DEFAULT_MODE

  // ------------------------------------
  // 固定出发机场
  // ------------------------------------

  params.origin = {
    city:
      params.origin.city ||
      SEARCH_CONFIG.ORIGIN.city,

    airport:
      params.origin.airport ||
      SEARCH_CONFIG.ORIGIN.airport,

    airportName:
      params.origin.airportName ||
      SEARCH_CONFIG.ORIGIN.airportName
  }

  return params
}


// ========================================
// 规范化已有 Search Params
// ========================================
//
// 用于：
//
// wx.getStorageSync('currentSearchParams')
//
// 如果旧版本数据存在缺失字段，统一补齐。
// ========================================

function normalizeSearchParams(params) {

  return createSearchParams(
    params || {}
  )
}


// ========================================
// 判断是否为往返
// ========================================

function isRoundTrip(params) {

  const normalized =
    normalizeSearchParams(params)

  return (
    normalized.tripType ===
    'round'
  )
}


// ========================================
// 判断是否为单程
// ========================================

function isOneWay(params) {

  const normalized =
    normalizeSearchParams(params)

  return (
    normalized.tripType ===
    'oneway'
  )
}


// ========================================
// 判断预算是否真正启用
// ========================================

function hasBudgetLimit(params) {

  const normalized =
    normalizeSearchParams(params)

  return (
    normalized.budgetSet === true &&
    normalized.unlimitedBudget !== true &&
    Number.isFinite(
      normalized.budget
    )
  )
}


// ========================================
// 判断是否为无限预算
// ========================================

function isUnlimitedBudget(params) {

  const normalized =
    normalizeSearchParams(params)

  return (
    normalized.unlimitedBudget === true
  )
}


// ========================================
// 获取有效旅行时长范围
// ========================================

function getDurationRange(params) {

  const normalized =
    normalizeSearchParams(params)

  return {

    min:
      normalized.minDuration,

    max:
      normalized.maxDuration
  }
}


// ========================================
// 导出
// ========================================

module.exports = {

  SEARCH_CONFIG,

  getDefaultSearchParams,

  createSearchParams,

  normalizeSearchParams,

  isRoundTrip,

  isOneWay,

  hasBudgetLimit,

  isUnlimitedBudget,

  getDurationRange
}