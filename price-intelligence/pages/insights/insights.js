const ROUTE_REPORTS = require('../../route-reports.js')
const ROUND_TRIP_REPORTS = require('../../round-trips/route-reports.js')
const ROUTE_OBSERVATIONS = require('../../observation-index.js')
const { analyzeWithLiveFares } = require('../../live-route-analysis.js')
const PUBLIC_FARES_URL = 'https://flight-destination-api.xu5lu2yi2.workers.dev'
const currency = require('../../../utils/currency-config.js')
const { INTELLIGENCE_DESTINATIONS } = require('../../../utils/destination-config.js')
const DESTINATION_BY_CODE = INTELLIGENCE_DESTINATIONS.reduce((map, item) => { map[item.code] = item; return map }, {})
const { getLanguage, setLanguage } = require('../../../utils/language.js')
const shareContent = require('../../../utils/share-content.js')
const ENGLISH_CITIES = { KUL:'Kuala Lumpur', PEN:'Penang', SIN:'Singapore', BKK:'Bangkok', HKT:'Phuket', CNX:'Chiang Mai', DPS:'Bali', CGK:'Jakarta', SGN:'Ho Chi Minh City', HAN:'Hanoi', MNL:'Manila', KCH:'Kuching', BKI:'Kota Kinabalu', LGK:'Langkawi', JHB:'Johor Bahru', KNO:'Medan', LOP:'Lombok', YIA:'Yogyakarta', SUB:'Surabaya', DAD:'Da Nang', CXR:'Nha Trang', PQC:'Phu Quoc', KTI:'Phnom Penh', SAI:'Siem Reap', VTE:'Vientiane', BWN:'Bandar Seri Begawan', CEB:'Cebu', HDY:'Hat Yai', KBV:'Krabi', AOR:'Alor Setar', KBR:'Kota Bharu', TGG:'Kuala Terengganu', TAG:'Tagbilaran', MYY:'Miri', SBW:'Sibu', TWU:'Tawau', SDK:'Sandakan', KOS:'Sihanoukville', PKU:'Pekanbaru', PLM:'Palembang', PDG:'Padang', PNK:'Pontianak', UPG:'Makassar', BPN:'Balikpapan', CGY:'Cagayan de Oro', ILO:'Iloilo', DVO:'Davao', BTU:'Bintulu', LBU:'Labuan', BTH:'Batam', LPQ:'Luang Prabang', KUA:'Kuantan', BTJ:'Banda Aceh', BDJ:'Banjarmasin', LBJ:'Labuan Bajo', SRG:'Semarang', DMK:'Bangkok (Don Mueang)', RGN:'Yangon', DIL:'Dili', DLI:'Da Lat' }
const EN_DAY_NAMES = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' }
const DAY_NAMES = {
  Monday: '周一', Tuesday: '周二', Wednesday: '周三', Thursday: '周四',
  Friday: '周五', Saturday: '周六', Sunday: '周日'
}
const CITY_NAMES = { KUL: '吉隆坡', PEN: '槟城', SIN: '新加坡', BKK: '曼谷', HKT: '普吉岛', CNX: '清迈', DPS: '巴厘岛', CGK: '雅加达', SGN: '胡志明市', HAN: '河内', MNL: '马尼拉' }

function money(value, sourceCurrency) {
  const selected = currency.getSelectedCurrency()
  return currency.formatNumber(currency.convert(value, sourceCurrency || 'MYR', selected), selected)
}
function formatBeijingTime(value) {
  if (!value) return ''
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}
function round(value) {
  return value === null || value === undefined ? null : Math.round(value * 100) / 100
}

function weekdayValsSafe(data) { return data.weekday_average !== null && data.weekend_average !== null }
function holidayPresentation(effect, language, sourceCurrency) {
  const holidayDates = effect.holiday_date_count || 0
  const comparisonDates = effect.comparison_date_count || 0
  const ready = effect.status === 'estimated'
  if (!ready) return {
    ready: false,
    holidayCount: holidayDates,
    comparisonCount: comparisonDates,
    holidayPrice: '—',
    comparisonPrice: '—',
    holidayBarWidth: '0%',
    comparisonBarWidth: '0%',
    changeText: language === 'en' ? 'Not enough samples' : '样本不足，暂不比较',
    changeClass: 'neutral',
    note: language === 'en'
      ? 'At least 3 distinct departure dates are needed in each group.'
      : '两组都需至少 3 个不同出发日期，才显示价格比较。',
    method: language === 'en'
      ? 'Holiday window: ±3 days · Round trips count if either leg matches · Descriptive sample only'
      : '假期前后 3 天 · 往返任一航段命中即计入 · 仅作样本描述'
  }
  const holidayPrice = money(effect.holiday_median, sourceCurrency)
  const comparisonPrice = money(effect.comparison_median, sourceCurrency)
  const difference = Number(effect.difference_percentage)
  const maxPrice = Math.max(Number(effect.holiday_median) || 0, Number(effect.comparison_median) || 0, 1)
  const changeText = difference >= 0
    ? (language === 'en' ? `${difference.toFixed(2)}% higher` : `高 ${difference.toFixed(2)}%`)
    : (language === 'en' ? `${Math.abs(difference).toFixed(2)}% lower` : `低 ${Math.abs(difference).toFixed(2)}%`)
  return {
    ready: true,
    holidayCount: holidayDates,
    comparisonCount: comparisonDates,
    holidayPrice,
    comparisonPrice,
    holidayBarWidth: `${Math.max(4, Math.round((Number(effect.holiday_median) / maxPrice) * 100))}%`,
    comparisonBarWidth: `${Math.max(4, Math.round((Number(effect.comparison_median) / maxPrice) * 100))}%`,
    changeText,
    changeClass: difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral',
    note: language === 'en'
      ? 'Observed public fares only; this does not show that holidays caused the difference or predict future prices.'
      : '基于已观察的公开报价；不代表假期造成价格变化，也不预测未来票价。',
    method: language === 'en'
      ? 'Holiday window: ±3 days · Nearby non-holiday dates: 7–35 days · Round trips count if either leg matches'
      : '假期窗口：前后 3 天 · 日常对照：相隔 7–35 天 · 往返任一航段命中即计入'
  }
}
function currencyInfoSymbol() {
  const code = currency.getSelectedCurrency()
  const item = currency.CURRENCIES.find(value => value.code === code)
  return item ? item.symbol : '￥'
}
Page({
  data: {
    language: 'zh', isEnglish: false, languageAction: 'EN', displayCurrency: 'CNY', currencySymbol: '¥',
    hasData: true,
    tripType: 'one_way',
    tripTypeLabel: '单程',
    routeTitle: 'KUL → PEN',
    routeSubtitle: '吉隆坡 → 槟城',
    chartPoints: [],
    selectedPoint: null,
    chartSegments: [],
    chartTicks: [],
    weekdaySummary: {},
    leadTimeRows: [],
    tripDurationMedian: '—',
    tripDurationRows: [],
    price: {},
    weekend: {},
    sample: {},
    holidayDisplay: {},
    sourceNames: '',
    leadNote: '',
    weekendNote: ''
  },

  onLoad(options, liveRows, cloudSummary) {
    this.currentOptions = options || {}
    const language = this.currentOptions.language === 'en' ? 'en' : this.currentOptions.language === 'zh' ? 'zh' : getLanguage()
    if (this.currentOptions.language) setLanguage(language)
    if (this.currentOptions.currency) currency.setSelectedCurrency(this.currentOptions.currency)
    const displayCurrency = currency.getSelectedCurrency()
    if (liveRows !== undefined) {
      this.currentLiveRows = liveRows
      this.currentCloudSummary = cloudSummary
    }
    const origin = options && options.origin ? options.origin : 'KUL'
    const destination = options && options.destination ? options.destination : 'PEN'
    const tripType = options && options.tripType === 'round_trip' ? 'round_trip' : 'one_way'
    const tripTypeLabel = language === 'en' ? (tripType === 'round_trip' ? 'Round trip' : 'One way') : (tripType === 'round_trip' ? '往返' : '单程')
    const destinationInfo = DESTINATION_BY_CODE[destination]
    const baseReport = (tripType === 'round_trip' ? ROUND_TRIP_REPORTS : ROUTE_REPORTS)[destination]
    const baselineRows = (tripType === 'round_trip' ? ROUTE_OBSERVATIONS.roundTrip : ROUTE_OBSERVATIONS.oneWay)[destination] || []
    const report = liveRows !== undefined
      ? analyzeWithLiveFares(baseReport, baselineRows, liveRows, cloudSummary, { destination, tripType })
      : baseReport
    const routeTitle = `${origin} → ${destination}`
    const routeSubtitle = `${language === 'en' ? ENGLISH_CITIES[origin] || origin : CITY_NAMES[origin] || origin} → ${language === 'en' ? ENGLISH_CITIES[destination] || destination : destinationInfo ? destinationInfo.name : destination}`
    const currencyInfo = currency.CURRENCIES.find(item => item.code === displayCurrency) || currency.CURRENCIES[0]
    this.setData({ language, isEnglish: language === 'en', languageAction: language === 'en' ? '简体中文' : 'EN', displayCurrency, currencySymbol: currencyInfo.symbol })
    wx.setNavigationBarTitle({ title: language === 'en' ? 'Flight Fare Analysis' : '航线价格分析' })
    if (liveRows === undefined) this.loadLiveObservations(destination, tripType)
    if (!report || origin !== report.route.origin || destination !== report.route.destination) {
      this.setData({ hasData: false, tripType, tripTypeLabel, routeTitle, routeSubtitle })
      return
    }
    const fareCurrency = report.route.currency
    const recordTypeCounts = report.sample.record_type_counts || { public_quote: report.sample.observation_count || 0 }
    const weekdayData = report.weekday_effect_by_departure_date_median
    const weekdayValues = Object.keys(DAY_NAMES)
      .map(day => currency.convert((weekdayData.weekdays[day] || {}).average, fareCurrency, displayCurrency))
      .filter(value => typeof value === 'number' && isFinite(value))
    const minValue = weekdayValues.length ? Math.min(...weekdayValues) : 0
    const maxValue = weekdayValues.length ? Math.max(...weekdayValues) : 20
    const range = Math.max(maxValue - minValue, maxValue * 0.1, 1)
    const paddedMin = Math.max(0, minValue - range * 0.08)
    const paddedMax = maxValue + range * 0.08
    const rawStep = (paddedMax - paddedMin) / 4
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
    const normalizedStep = rawStep / magnitude
    const niceStep = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10
    const tickStep = niceStep * magnitude
    const axisMin = Math.max(0, Math.floor(paddedMin / tickStep) * tickStep)
    let axisMax = Math.ceil(paddedMax / tickStep) * tickStep
    if (axisMax <= axisMin) axisMax = axisMin + tickStep
    const chartTop = 30
    const chartBottom = 136
    const xStart = 40
    const xEnd = 280
    const yForValue = value => chartBottom - ((value - axisMin) / (axisMax - axisMin)) * (chartBottom - chartTop)
    const chartTicks = []
    for (let value = axisMax; value >= axisMin; value -= tickStep) {
      chartTicks.push({ value, top: round(yForValue(value)) })
    }

    const chartPoints = Object.keys(DAY_NAMES).map((day, index) => {
      const item = weekdayData.weekdays[day] || {}
      const x = xStart + (index * (xEnd - xStart)) / 6
      const convertedAverage = currency.convert(item.average, fareCurrency, displayCurrency)
      const y = convertedAverage === null ? null : yForValue(convertedAverage)
      return {
        day: language === 'en' ? EN_DAY_NAMES[day] : DAY_NAMES[day],
        average: money(item.average, fareCurrency),
        hasValue: convertedAverage !== null,
        count: item.count || 0,
        x: round(x),
        y: round(y),
        pointLeft: round(x - 7),
        pointTop: round(y - 7),
        valueLeft: round(x - 35),
        valueTop: round(y - 30),
        dayLeft: round(x - 30),
        isLowest: day === weekdayData.lowest_average_day,
        isHighest: day === weekdayData.highest_average_day,
        isSelected: false
      }
    })

    const leadBuckets = report.advance_purchase_window_by_departure_date_median.buckets || []
    const maxLeadAverage = Math.max(...leadBuckets.map(item => item.average || 0), 1)
    const lowestAverageWindow = report.advance_purchase_window_by_departure_date_median.lowest_average_window
    const hasLeadWindow = leadBuckets.some(item => item.count) && !!lowestAverageWindow
    const leadTimeRows = leadBuckets.map(item => ({
      range: item.range,
      isLowest: item.range === lowestAverageWindow,
      average: money(item.average, fareCurrency),
      count: item.count,
      width: item.average === null ? '0%' : `${Math.max(4, Math.round((item.average / maxLeadAverage) * 100))}%`
    }))
    const durationData = report.round_trip_duration || { median_nights: null, buckets: [] }
    const maxDurationAverage = Math.max(...durationData.buckets.map(item => item.average || 0), 1)
    const tripDurationRows = durationData.buckets.map(item => ({
      range: item.range,
      average: money(item.average, fareCurrency),
      count: item.count,
      width: item.average === null ? '0%' : `${Math.max(4, Math.round((item.average / maxDurationAverage) * 100))}%`
    }))
    const premium = weekdayData.weekend_premium_percentage
    const weekendLabel = language === 'en' ? (premium === null ? 'Not enough samples to compare' : premium < 0 ? `Weekend average is ${Math.abs(premium).toFixed(2)}% lower in this sample` : premium > 0 ? `Weekend average is ${premium.toFixed(2)}% higher in this sample` : 'Weekend and weekday averages are similar in this sample') : premium === null
      ? '样本不足，暂无法比较'
      : premium < 0
        ? `这组样本中，周末均价低 ${Math.abs(premium).toFixed(2)}%`
        : premium > 0
          ? `这组样本中，周末均价高 ${premium.toFixed(2)}%`
          : '这组样本中，周末与工作日均价接近'

    this.setData({
      routeTitle,
      routeSubtitle,
      tripType,
      tripTypeLabel,
      chartPoints,
      chartTicks,
      selectedPoint: null,
      weekdaySummary: {
        lowestDay: (language === 'en' ? EN_DAY_NAMES : DAY_NAMES)[weekdayData.lowest_average_day] || '—',
        lowestAverage: weekdayData.lowest_average_day ? money(weekdayData.weekdays[weekdayData.lowest_average_day].average, fareCurrency) : '—',
        highestDay: (language === 'en' ? EN_DAY_NAMES : DAY_NAMES)[weekdayData.highest_average_day] || '—',
        highestAverage: weekdayData.highest_average_day ? money(weekdayData.weekdays[weekdayData.highest_average_day].average, fareCurrency) : '—'
      },
      leadTimeRows,
      tripDurationMedian: durationData.median_nights === null ? '—' : `${durationData.median_nights} ${language === 'en' ? 'nights' : '晚'}`,
      tripDurationRows,
      price: {
        minimum: money(report.price_distribution_raw_quotes.minimum, fareCurrency),
        p10: money(report.price_distribution_raw_quotes.p10, fareCurrency),
        p25: money(report.price_distribution_raw_quotes.p25, fareCurrency),
        median: money(report.price_distribution_raw_quotes.median, fareCurrency),
        p75: money(report.price_distribution_raw_quotes.p75, fareCurrency),
        p90: money(report.price_distribution_raw_quotes.p90, fareCurrency),
        maximum: money(report.price_distribution_raw_quotes.maximum, fareCurrency)
      },
      weekend: {
        label: weekendLabel,
        weekdayAverage: money(weekdayData.weekday_average, fareCurrency),
        weekendAverage: money(weekdayData.weekend_average, fareCurrency),
        lowestDay: (language === 'en' ? EN_DAY_NAMES : DAY_NAMES)[weekdayData.lowest_average_day] || '—',
        highestDay: (language === 'en' ? EN_DAY_NAMES : DAY_NAMES)[weekdayData.highest_average_day] || '—'
      },
      sample: {
        observationCount: report.sample.observation_count,
        dateCount: report.sample.distinct_departure_dates,
        publicQuoteCount: recordTypeCounts.public_quote || 0,
        historicalQuoteCount: recordTypeCounts.historical_public_quote || 0,
        transactionCount: recordTypeCounts.documented_transaction || 0,
        recordBreakdown: language === 'en'
          ? `Record types: ${recordTypeCounts.public_quote || 0} public quotes · ${recordTypeCounts.historical_public_quote || 0} past-date quotes · ${recordTypeCounts.documented_transaction || 0} page-stated order records`
          : `样本构成：公开报价 ${recordTypeCounts.public_quote || 0} 条 · 过去日期报价 ${recordTypeCounts.historical_public_quote || 0} 条 · 网页自述订单 ${recordTypeCounts.documented_transaction || 0} 条`,
        referenceLevel: language === 'en' ? (report.sample.reference_level === 'medium' ? 'Medium reliability' : report.sample.reference_level === 'high' ? 'High reliability' : 'Low reliability') : report.sample.reference_level ? `${report.sample.reference_level}参考度` : '较低参考度',
        fxDescription: currency.description(fareCurrency, displayCurrency),
        fxDescriptionEnglish: `Displayed in ${displayCurrency}; conversions use CNY as the common base and the project reference rate.`,
        reason: report.sample.reference_reason,
        reasonEnglish: 'Reliability depends on the number of observations, dates, source coverage, and record type.',
        collectionDate: (report.sample.collection_dates || []).join('、'),
        sourceFreshnessNote: report.sample.source_freshness_note || '来源页面采集时间未单独标注',
        sourceFreshnessEnglish: 'Public listings can change. Past-date quotes and documented payment records are identified separately.',
        sourceCount: (report.sample.sources || []).length,
        cloudObservationCount: report.live_unique_observation_count || 0,
        cloudAnalysisAt: cloudSummary && cloudSummary.generated_at ? formatBeijingTime(cloudSummary.generated_at) : '',
        cloudMergeNote: language === 'en'
          ? `Cloud matched ${report.live_unique_observation_count || 0} fares · deduplicated total ${report.sample.observation_count}${cloudSummary && cloudSummary.generated_at ? ` · Worker analysis ${formatBeijingTime(cloudSummary.generated_at)} Beijing time` : ''}`
          : `云端匹配 ${report.live_unique_observation_count || 0} 条报价 · 去重合并后共 ${report.sample.observation_count} 条${cloudSummary && cloudSummary.generated_at ? ` · Worker 分析时间 ${formatBeijingTime(cloudSummary.generated_at)}（北京时间）` : ''}`
      },
      holidayDisplay: holidayPresentation(report.holiday_effect || {}, language, fareCurrency),
      hasLeadWindow,
      leadWindow: hasLeadWindow ? lowestAverageWindow : '',
      weekendNote: language === 'en' ? (weekdayData.weekday_average !== null && weekdayData.weekend_average !== null ? 'Based on the combined sample records. Coverage is limited and differences may not be consistent.' : 'There are not enough weekday or weekend samples to compare.') : weekdayData.weekday_average !== null && weekdayData.weekend_average !== null ? '工作日与周末数据来自合并样本；覆盖范围有限，差异不代表稳定规律。' : '缺少工作日或周末样本，暂时无法比较。',
      sourceNames: (report.sample.sources || []).join('、')
    }, () => this.drawWeekdayChart(chartPoints, chartTicks))
  },

  loadLiveObservations(destination, tripType) {
    wx.request({
      url: `${PUBLIC_FARES_URL}/public-fares.json?destination=${encodeURIComponent(destination)}`,
      method: 'GET',
      timeout: 12000,
      success: response => {
        const body = response && response.data
        if (!body || !body.success || !Array.isArray(body.observations)) {
          console.error('[public-fares] Unexpected collector response', response && response.statusCode, body)
          return
        }
        const liveRows = body.observations
          .filter(item => item && item.trip_type === tripType && Number.isFinite(Number(item.price)))
          .map(item => Object.assign({}, item, {
            flight_date: item.flight_date || item.departure_date,
            collected_at: item.collected_at || item.last_seen,
            last_seen: item.last_seen || item.collected_at
          }))
        const cloudSummary = body.analysis && body.analysis[tripType]
        this.onLoad(this.currentOptions, liveRows, cloudSummary)
      },
      fail: error => {
        console.error('[public-fares] Collector request failed', error)
      }
    })
  },

  selectLanguage(event) {
    const language = event.currentTarget.dataset.language === 'en' ? 'en' : 'zh'
    if (language === this.data.language) return
    setLanguage(language)
    this.currentOptions = Object.assign({}, this.currentOptions, { language })
    this.onLoad(this.currentOptions)
  },
  selectCurrency() {
    wx.showActionSheet({
      itemList: currency.getCurrencyOptions(this.data.language),
      success: result => {
        const selected = currency.CURRENCIES[result.tapIndex]
        if (!selected) return
        currency.setSelectedCurrency(selected.code)
        this.currentOptions = Object.assign({}, this.currentOptions, { currency: selected.code })
        this.setData({ displayCurrency: selected.code })
        this.onLoad(this.currentOptions, this.currentLiveRows, this.currentCloudSummary)
      }
    })
  },
  onShareAppMessage() {
    const title = this.data.isEnglish
      ? `${this.data.tripTypeLabel} fare analysis: ${this.data.routeSubtitle}`
      : `${this.data.routeSubtitle}${this.data.tripTypeLabel}机票价格分析`
    const query = {
      origin: this.currentOptions.origin || 'KUL',
      destination: this.currentOptions.destination || 'PEN',
      tripType: this.currentOptions.tripType || 'one_way'
    }
    return shareContent.appMessage(title, '/price-intelligence/pages/insights/insights', query)
  },
  onShareTimeline() {
    const title = this.data.isEnglish
      ? `${this.data.tripTypeLabel} fare trends: ${this.data.routeSubtitle}`
      : `${this.data.routeSubtitle}${this.data.tripTypeLabel}票价趋势`
    return shareContent.timeline(title, {
      origin: this.currentOptions.origin || 'KUL',
      destination: this.currentOptions.destination || 'PEN',
      tripType: this.currentOptions.tripType || 'one_way'
    })
  },
  onChartTap(event) {
    this.selectChartPoint(event)
  },
  onChartTouchMove(event) {
    this.selectChartPoint(event)
  },
  selectChartPoint(event) {
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]) || event.detail || {}
    const touchX = Number(touch.x !== undefined ? touch.x : touch.offsetX)
    const touchY = Number(touch.y !== undefined ? touch.y : touch.offsetY)
    if (!Number.isFinite(touchX) || !Number.isFinite(touchY)) return

    const system = wx.getSystemInfoSync()
    const canvasCssWidth = 610 / 750 * system.windowWidth
    const canvasCssHeight = 320 / 750 * system.windowWidth
    const x = touchX * 300 / canvasCssWidth
    const y = touchY * 160 / canvasCssHeight
    const points = this.data.chartPoints || []
    const nearest = points.filter(point => point.hasValue).reduce((best, point) => {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
      return !best || distance < best.distance ? { point, distance } : best
    }, null)
    if (!nearest || nearest.distance > 24) return
    if (this.data.selectedPoint && this.data.selectedPoint.day === nearest.point.day) return

    const tooltipWidth = 174
    const left = Math.max(6, Math.min(610 - tooltipWidth - 6, nearest.point.x / 300 * 610 - tooltipWidth / 2))
    const pointTop = nearest.point.y / 160 * 320
    const top = pointTop < 86 ? pointTop + 22 : pointTop - 66
    const chartPoints = points.map(point => Object.assign({}, point, { isSelected: point.day === nearest.point.day }))
    this.setData({
      chartPoints,
      selectedPoint: { day: nearest.point.day, average: nearest.point.average, left: Math.round(left), top: Math.round(top) }
    }, () => this.drawWeekdayChart(chartPoints, this.data.chartTicks))
  },
  drawWeekdayChart(points, ticks) {
    const context = wx.createCanvasContext('weekdayChart', this)
    const width = 300
    const chartLeft = 38
    const chartRight = 294

    context.clearRect(0, 0, width, 160)
    context.setFillStyle('#7f8c8c')
    context.setFontSize(10)
    context.fillText(this.data.isEnglish ? `Fare (${this.data.displayCurrency})` : `价格（${this.data.displayCurrency}）`, 4, 14)

    ticks.forEach(tick => {
      context.setStrokeStyle('#e7edec')
      context.setLineWidth(1)
      context.beginPath()
      context.moveTo(chartLeft, tick.top)
      context.lineTo(chartRight, tick.top)
      context.stroke()
      context.setFillStyle('#899595')
      context.setFontSize(10)
      context.fillText(currency.formatNumber(tick.value, this.data.displayCurrency), 4, tick.top + 4)
    })

    context.setStrokeStyle('#159fa0')
    context.setLineWidth(2.5)
    let segmentOpen = false
    points.forEach(point => {
      if (!point.hasValue) { segmentOpen = false; return }
      if (!segmentOpen) { context.beginPath(); context.moveTo(point.x, point.y); segmentOpen = true }
      else context.lineTo(point.x, point.y)
      context.stroke()
    })

    points.filter(point => point.hasValue).forEach(point => {
      if (point.isSelected) {
        context.setFillStyle('#dff4f1')
        context.setStrokeStyle('#9edbd5')
        context.setLineWidth(1)
        context.beginPath()
        context.arc(point.x, point.y, 10, 0, 2 * Math.PI)
        context.fill()
        context.stroke()
      }
      context.setFillStyle(point.isLowest ? '#159fa0' : point.isHighest ? '#f0a24a' : '#ffffff')
      context.setStrokeStyle(point.isHighest ? '#f0a24a' : '#159fa0')
      context.setLineWidth(point.isSelected ? 2.5 : 2)
      context.beginPath()
      context.arc(point.x, point.y, point.isSelected ? 5 : 4, 0, 2 * Math.PI)
      context.fill()
      context.stroke()
      if (!point.isSelected && (point.isLowest || point.isHighest)) {
        context.setFillStyle(point.isLowest ? '#159fa0' : '#d7852d')
        context.setFontSize(11)
        context.fillText(point.average, point.x - 20, point.isHighest ? point.y - 9 : point.y + 19)
      }
    })

    context.draw()
  }
})





