const { INTELLIGENCE_DESTINATIONS } = require('../../utils/destination-config.js')
const { getLanguage, setLanguage } = require('../../utils/language.js')
const currency = require('../../utils/currency-config.js')
const shareContent = require('../../utils/share-content.js')
const sampleIndex = require('../../utils/sample-index.js')
const PUBLIC_FARES_URL = 'https://flight-destination-api.xu5lu2yi2.workers.dev'

function formatBeijingTime(value) {
  if (!value) return ''
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

const ENGLISH_DESTINATIONS = {
  PEN:['Penang','Malaysia'], SIN:['Singapore','Singapore'], BKK:['Bangkok','Thailand'], HKT:['Phuket','Thailand'], CNX:['Chiang Mai','Thailand'], DPS:['Bali','Indonesia'], CGK:['Jakarta','Indonesia'], SGN:['Ho Chi Minh City','Vietnam'], HAN:['Hanoi','Vietnam'], MNL:['Manila','Philippines'], KCH:['Kuching','Malaysia'], BKI:['Kota Kinabalu','Malaysia'], LGK:['Langkawi','Malaysia'], JHB:['Johor Bahru','Malaysia'], KNO:['Medan','Indonesia'], LOP:['Lombok','Indonesia'], YIA:['Yogyakarta','Indonesia'], SUB:['Surabaya','Indonesia'], DAD:['Da Nang','Vietnam'], CXR:['Nha Trang','Vietnam'], PQC:['Phu Quoc','Vietnam'], KTI:['Phnom Penh','Cambodia'], SAI:['Siem Reap','Cambodia'], VTE:['Vientiane','Laos'], BWN:['Bandar Seri Begawan','Brunei'], CEB:['Cebu','Philippines'], HDY:['Hat Yai','Thailand'], KBV:['Krabi','Thailand'], AOR:['Alor Setar','Malaysia'], KBR:['Kota Bharu','Malaysia'], TGG:['Kuala Terengganu','Malaysia'], TAG:['Tagbilaran','Philippines'], MYY:['Miri','Malaysia'], SBW:['Sibu','Malaysia'], TWU:['Tawau','Malaysia'], SDK:['Sandakan','Malaysia'], KOS:['Sihanoukville','Cambodia'], PKU:['Pekanbaru','Indonesia'], PLM:['Palembang','Indonesia'], PDG:['Padang','Indonesia'], PNK:['Pontianak','Indonesia'], UPG:['Makassar','Indonesia'], BPN:['Balikpapan','Indonesia'], CGY:['Cagayan de Oro','Philippines'], ILO:['Iloilo','Philippines'], DVO:['Davao','Philippines'], BTU:['Bintulu','Malaysia'], LBU:['Labuan','Malaysia'], BTH:['Batam','Indonesia'], LPQ:['Luang Prabang','Laos'], KUA:['Kuantan','Malaysia'], BTJ:['Banda Aceh','Indonesia'], BDJ:['Banjarmasin','Indonesia'], LBJ:['Labuan Bajo','Indonesia'], SRG:['Semarang','Indonesia'], DMK:['Bangkok (Don Mueang)','Thailand'], RGN:['Yangon','Myanmar'], DIL:['Dili','Timor-Leste'], DLI:['Da Lat','Vietnam']
}

const PINYIN = {
  PEN: 'bincheng', SIN: 'xinjiapo', BKK: 'mangu', HKT: 'pujidao', CNX: 'qingmai', DPS: 'balidao',
  CGK: 'yajiada', SGN: 'huzhimingshi', HAN: 'henei', MNL: 'manila', KCH: 'gujin', BKI: 'yabi',
  LGK: 'lankawi', JHB: 'xinshan', KNO: 'mianlan', LOP: 'longmuda', YIA: 'rire', SUB: 'sishui',
  DAD: 'xiangang', CXR: 'yazhuang', PQC: 'fuguodao', KTI: 'jinbian', SAI: 'xianli', VTE: 'wanxiang',
  BWN: 'silibajiawan', CEB: 'suwu', HDY: 'heai', KBV: 'jiami', AOR: 'yaluoshida', KBR: 'gedabalu'
}

function buildDestinations(tripType, language) {
  return INTELLIGENCE_DESTINATIONS.map(item => {
    const sample = sampleIndex.summarize(item.code, tripType)
    return {
      label: language === 'en' && ENGLISH_DESTINATIONS[item.code] ? ENGLISH_DESTINATIONS[item.code][0] : item.name,
      code: item.code, detail: language === 'en' ? `${item.code} Airport` : item.airportName,
      country: language === 'en' && ENGLISH_DESTINATIONS[item.code] ? ENGLISH_DESTINATIONS[item.code][1] : item.country,
      pinyin: item.pinyin || PINYIN[item.code] || item.name.toLowerCase(),
      hasAnalysis: sample.sampleCount > 0,
      sampleCount: sample.sampleCount,
      dateCount: sample.dateCount,
      collectionDate: sample.collectionDates.join(language === 'en' ? ', ' : '、')
    }
  })
}

function rankedDestinations(items) {
  return items
    .map((destination, poolOrder) => ({ ...destination, poolOrder }))
    .sort((a, b) => b.sampleCount - a.sampleCount || a.poolOrder - b.poolOrder)
    .slice(0, 10)
    .map(({ poolOrder, ...destination }) => destination)
}

function applyCloudRankings(page, tripType, cloudRows) {
  if (page.data.tripType !== tripType) return
  const rowsByDestination = {}
  ;(cloudRows || []).forEach(row => {
    if (!row || !row.destination) return
    const list = rowsByDestination[row.destination] || (rowsByDestination[row.destination] = [])
    list.push(row)
  })
  destinations = destinations.map(destination => {
    const summary = sampleIndex.summarize(destination.code, tripType, rowsByDestination[destination.code])
    return Object.assign({}, destination, {
      hasAnalysis: summary.sampleCount > 0,
      sampleCount: summary.sampleCount,
      dateCount: summary.dateCount,
      collectionDate: summary.collectionDates.join(page.data.language === 'en' ? ', ' : '、')
    })
  })
  const selected = destinations.find(item => item.code === page.data.destinationCode)
  page.setData({
    destinations,
    topDestinations: rankedDestinations(destinations),
    destinationGroups: buildGroups(destinations),
    ...(selected ? { sampleCount: selected.sampleCount, dateCount: selected.dateCount } : {})
  })
}

function retryDestinationRankings(page, tripType, requestId, attempt, error) {
  if (requestId !== page.rankingRequestId || page.rankingPageHidden) return
  if (attempt >= 2) {
    console.error('[public-fares] Ranking refresh failed after retries', error)
    return
  }
  const delays = [1500, 5000]
  page.rankingRetryTimer = setTimeout(() => {
    if (requestId === page.rankingRequestId && !page.rankingPageHidden) {
      requestDestinationRankings(page, tripType, requestId, attempt + 1)
    }
  }, delays[attempt])
}

function requestDestinationRankings(page, tripType, requestId, attempt) {
  const cacheBuster = Date.now()
  wx.request({
    url: `${PUBLIC_FARES_URL}/rankings.json?trip_type=${encodeURIComponent(tripType)}&refresh=${cacheBuster}`,
    method: 'GET', timeout: 20000,
    success: response => {
      if (requestId !== page.rankingRequestId || page.rankingPageHidden) return
      const body = response && response.data
      if (response.statusCode >= 200 && response.statusCode < 300 && body && body.success && Array.isArray(body.observations)) {
        if (page.rankingRetryTimer) clearTimeout(page.rankingRetryTimer)
        page.rankingRetryTimer = null
        applyCloudRankings(page, tripType, body.observations)
        return
      }
      retryDestinationRankings(page, tripType, requestId, attempt, {
        statusCode: response && response.statusCode,
        error: body && (body.message || body.error) || 'unexpected_ranking_response'
      })
    },
    fail: error => retryDestinationRankings(page, tripType, requestId, attempt, error)
  })
}

function loadDestinationRankings(page, tripType) {
  const requestId = (page.rankingRequestId || 0) + 1
  page.rankingRequestId = requestId
  if (page.rankingRetryTimer) clearTimeout(page.rankingRetryTimer)
  page.rankingRetryTimer = null
  requestDestinationRankings(page, tripType, requestId, 0)
}

function beijingDateKey(date) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

function checkDailyCollectionAndRefresh(page, expectedDate, attempts) {
  if (page.dailyRefreshStopped) return
  wx.request({
    url: `${PUBLIC_FARES_URL}/status.json`, method: 'GET', timeout: 10000,
    success: response => {
      if (page.dailyRefreshStopped) return
      const lastRun = response && response.data && response.data.last_run
      const lastRunDate = lastRun && lastRun.scheduled_at ? formatBeijingTime(lastRun.scheduled_at).slice(0, 10) : ''
      if (lastRunDate === expectedDate) {
        loadDestinationRankings(page, page.data.tripType)
        loadLatestPublicFares(page, page.data.destinationCode, page.data.tripType, page.data.language)
        scheduleDailyCollectionRefresh(page, true)
        return
      }
      if (attempts < 60) {
        page.dailyRefreshRetryTimer = setTimeout(() => checkDailyCollectionAndRefresh(page, expectedDate, attempts + 1), 60000)
      }
    },
    fail: () => {
      if (!page.dailyRefreshStopped && attempts < 60) {
        page.dailyRefreshRetryTimer = setTimeout(() => checkDailyCollectionAndRefresh(page, expectedDate, attempts + 1), 60000)
      }
    }
  })
}

function scheduleDailyCollectionRefresh(page, skipCurrentRunCheck) {
  if (page.dailyRefreshTimer) clearTimeout(page.dailyRefreshTimer)
  const now = new Date()
  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const nextRun = new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate() + 1, 0, 5))
  const expectedDate = `${nextRun.getUTCFullYear()}-${String(nextRun.getUTCMonth() + 1).padStart(2, '0')}-${String(nextRun.getUTCDate()).padStart(2, '0')}`
  const delay = nextRun.getTime() - beijingNow.getTime()
  page.dailyRefreshTimer = setTimeout(() => checkDailyCollectionAndRefresh(page, expectedDate, 0), Math.max(1000, delay))
  if (!skipCurrentRunCheck && beijingNow.getUTCHours() === 0) checkDailyCollectionAndRefresh(page, beijingDateKey(now), 0)
}

function sampleState(code, tripType, language) {
  const sample = sampleIndex.summarize(code, tripType)
  const typeLabel = tripType === 'round_trip' ? '往返' : '单程'
  return {
    sampleCount: sample.sampleCount,
    dateCount: sample.dateCount,
    cloudSampleCount: 0,
    sampleMergeNote: language === 'en' ? 'Waiting for cloud fare data…' : '等待云端报价并合并统计…',
    collectionDate: sample.collectionDates.join(language === 'en' ? ', ' : '、'),
    routeAvailability: sample.sampleCount
      ? language === 'en' ? `${sample.sampleCount} ${tripType === 'round_trip' ? 'round-trip' : 'one-way'} fare samples available` : `已收录 ${sample.sampleCount} 条${typeLabel}标价样本`
      : language === 'en' ? `No ${tripType === 'round_trip' ? 'round-trip' : 'one-way'} fare samples for this route` : `该航线暂无${typeLabel}价格样本`
  }
}

function openDestinationAnalysis(destination, tripType) {
  wx.navigateTo({
    url: '/price-intelligence/pages/insights/insights?origin=KUL&destination=' + encodeURIComponent(destination) + '&tripType=' + tripType
  })
}

function syncMergedSample(page, destination, tripType, language, observations, cloudSummary) {
  const summary = sampleIndex.summarize(destination, tripType, observations)
  const mergedCount = summary.sampleCount
  const cloudCount = summary.cloudSampleCount
  const dates = summary.collectionDates.join(language === 'en' ? ', ' : '、')
  const sampleMergeNote = language === 'en'
    ? `Cloud matched ${cloudCount} fares · deduplicated total ${mergedCount}${cloudSummary && cloudSummary.generated_at ? ` · analyzed ${formatBeijingTime(cloudSummary.generated_at)} Beijing time` : ''}`
    : `云端匹配 ${cloudCount} 条 · 去重合并后 ${mergedCount} 条${cloudSummary && cloudSummary.generated_at ? ` · 自动分析于 ${formatBeijingTime(cloudSummary.generated_at)}（北京时间）` : ''}`
  page.setData({
    sampleCount: mergedCount,
    dateCount: summary.dateCount,
    collectionDate: dates,
    cloudSampleCount: cloudCount,
    sampleMergeNote,
    routeAvailability: language === 'en'
      ? `${mergedCount} ${tripType === 'round_trip' ? 'round-trip' : 'one-way'} fare samples after cloud merge`
      : `云端合并后共 ${mergedCount} 条${tripType === 'round_trip' ? '往返' : '单程'}标价样本`
  })
}

let destinations = buildDestinations('one_way', 'zh')

function buildGroups(items) {
  const sorted = items.slice().sort((a, b) => a.pinyin < b.pinyin ? -1 : a.pinyin > b.pinyin ? 1 : a.code.localeCompare(b.code))
  const groups = []
  sorted.forEach(item => {
    const initial = item.pinyin.charAt(0).toUpperCase()
    let group = groups[groups.length - 1]
    if (!group || group.initial !== initial) {
      group = { initial, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  })
  return groups
}

function filterDestinations(keyword) {
  const query = String(keyword || '').trim().toLowerCase()
  if (!query) return destinations
  return destinations.filter(item => [item.label, item.code, item.country, item.pinyin, item.detail].join(' ').toLowerCase().indexOf(query) >= 0)
}

const topDestinations = rankedDestinations(destinations)

function retryLatestPublicFares(page, destination, tripType, language, requestId, attempt, error) {
  if (requestId !== page.latestFareRequestId || page.rankingPageHidden) return
  if (attempt >= 2) {
    console.error('[public-fares] Collector request failed after retries', error)
    return
  }
  const delays = [1500, 5000]
  page.latestFareRetryTimer = setTimeout(() => {
    if (requestId === page.latestFareRequestId && !page.rankingPageHidden) {
      requestLatestPublicFares(page, destination, tripType, language, requestId, attempt + 1)
    }
  }, delays[attempt])
}

function requestLatestPublicFares(page, destination, tripType, language, requestId, attempt) {
  const refresh = Date.now()
  wx.request({
    url: `${PUBLIC_FARES_URL}/public-fares.json?destination=${encodeURIComponent(destination)}&refresh=${refresh}`,
    method: 'GET', timeout: 20000,
    success: response => {
      if (requestId !== page.latestFareRequestId || page.rankingPageHidden) return
      const body = response && response.data
      if (!(response.statusCode >= 200 && response.statusCode < 300) || !body || !body.success || !Array.isArray(body.observations)) {
        retryLatestPublicFares(page, destination, tripType, language, requestId, attempt, {
          statusCode: response && response.statusCode,
          error: body && typeof body === 'object' && (body.message || body.error) || 'unexpected_collector_response'
        })
        return
      }
      if (page.latestFareRetryTimer) clearTimeout(page.latestFareRetryTimer)
      page.latestFareRetryTimer = null
      const cloudSummary = body.analysis && body.analysis[tripType]
      syncMergedSample(page, destination, tripType, language, body.observations, cloudSummary)
    },
    fail: error => {
      retryLatestPublicFares(page, destination, tripType, language, requestId, attempt, error && error.errMsg || 'request_failed')
    }
  })
}

function loadLatestPublicFares(page, destination, tripType, language) {
  const requestId = (page.latestFareRequestId || 0) + 1
  page.latestFareRequestId = requestId
  if (page.latestFareRetryTimer) clearTimeout(page.latestFareRetryTimer)
  page.latestFareRetryTimer = null
  requestLatestPublicFares(page, destination, tripType, language, requestId, 0)

  wx.request({
    url: `${PUBLIC_FARES_URL}/status.json`, method: 'GET', timeout: 12000,
    success: response => {
      if (requestId !== page.latestFareRequestId) return
      const lastRun = response && response.data && response.data.last_run
      const lastRunLabel = lastRun && lastRun.scheduled_at ? formatBeijingTime(lastRun.scheduled_at) : ''
      const runCounts = lastRun
        ? (language === 'en'
          ? ` · ${lastRun.pages_attempted || 0} pages checked · ${lastRun.quotes_added || 0} new fares · ${lastRun.analysis_destinations_updated || 0} routes analyzed · ${lastRun.pages_failed_or_blocked || 0} unavailable`
          : ` · 检查 ${lastRun.pages_attempted || 0} 页 · 新报价 ${lastRun.quotes_added || 0} 条 · 分析 ${lastRun.analysis_destinations_updated || 0} 条航线 · 不可访问 ${lastRun.pages_failed_or_blocked || 0} 页`)
        : ''
      const label = lastRunLabel
        ? (language === 'en' ? `Daily job · Beijing 00:00 · last run ${lastRunLabel}${runCounts}` : `每日任务 · 北京时间 00:00 · 最近运行 ${lastRunLabel}${runCounts}`)
        : (language === 'en' ? 'Daily job · Beijing 00:00 · awaiting the first scheduled run' : '每日任务 · 北京时间 00:00 · 等待首次定时运行')
      page.setData({ collectorStatusLabel: label })
    }
  })
}

Page({
  data: {
    language: 'zh', isEnglish: false,
    displayCurrency: 'CNY', currencySymbol: '￥',
    destinations, topDestinations, destinationGroups: buildGroups(destinations), showDestinationPicker: false,
    tripType: 'one_way',
    destinationSearchKeyword: '', pendingDestinationCode: 'PEN', originIndex: 0, destinationIndex: 0,
    originLabel: '吉隆坡', originCode: 'KUL', destinationLabel: '槟城', destinationCode: 'PEN',
    collectorStatusLabel: '',
    ...sampleState('PEN', 'one_way', 'zh')
  },
  onLoad(options) {
    const query = options || {}
    const language = query.language === 'en' ? 'en' : query.language === 'zh' ? 'zh' : getLanguage()
    if (query.language) setLanguage(language)
    if (query.currency) currency.setSelectedCurrency(query.currency)
    const tripType = query.tripType === 'round_trip' ? 'round_trip' : 'one_way'
    const nextDestinations = buildDestinations(tripType, language)
    destinations = nextDestinations
    const requested = nextDestinations.find(item => item.code === String(query.destination || '').toUpperCase()) || nextDestinations.find(item => item.code === 'PEN') || nextDestinations[0]
    const index = nextDestinations.findIndex(item => item.code === requested.code)
    this.setData({
      language, isEnglish: language === 'en', tripType, destinations: nextDestinations,
      topDestinations: rankedDestinations(nextDestinations), destinationGroups: buildGroups(nextDestinations),
      destinationCode: requested.code, destinationLabel: requested.label, destinationIndex: index,
      pendingDestinationCode: requested.code,
      ...sampleState(requested.code, tripType, language)
    })
  },
  onShow() {
    this.dailyRefreshStopped = false
    this.rankingPageHidden = false
    const language = getLanguage()
    const displayCurrency = currency.getSelectedCurrency()
    const currencyInfo = currency.CURRENCIES.find(item => item.code === displayCurrency) || currency.CURRENCIES[0]
    this.setData({ displayCurrency, currencySymbol: currencyInfo.symbol })
    this.applyLanguage(language)
    loadLatestPublicFares(this, this.data.destinationCode, this.data.tripType, language)
    loadDestinationRankings(this, this.data.tripType)
    scheduleDailyCollectionRefresh(this)
    wx.setNavigationBarTitle({ title: language === 'en' ? 'Flight Fare Analysis' : '航线价格分析' })
  },
  onHide() {
    this.dailyRefreshStopped = true
    this.rankingPageHidden = true
    if (this.dailyRefreshTimer) clearTimeout(this.dailyRefreshTimer)
    if (this.dailyRefreshRetryTimer) clearTimeout(this.dailyRefreshRetryTimer)
    if (this.rankingRetryTimer) clearTimeout(this.rankingRetryTimer)
    if (this.latestFareRetryTimer) clearTimeout(this.latestFareRetryTimer)
  },
  onUnload() {
    this.dailyRefreshStopped = true
    this.rankingPageHidden = true
    if (this.dailyRefreshTimer) clearTimeout(this.dailyRefreshTimer)
    if (this.dailyRefreshRetryTimer) clearTimeout(this.dailyRefreshRetryTimer)
    if (this.rankingRetryTimer) clearTimeout(this.rankingRetryTimer)
    if (this.latestFareRetryTimer) clearTimeout(this.latestFareRetryTimer)
  },
  onShareAppMessage() {
    const title = this.data.isEnglish
      ? `Explore flight fares to ${this.data.destinationLabel}`
      : `看看吉隆坡到${this.data.destinationLabel}的机票价格分析`
    const query = { destination: this.data.destinationCode, tripType: this.data.tripType }
    return shareContent.appMessage(title, '/pages/index/index', query)
  },
  onShareTimeline() {
    const title = this.data.isEnglish
      ? `Flight fare trends: Kuala Lumpur to ${this.data.destinationLabel}`
      : `吉隆坡到${this.data.destinationLabel}机票价格趋势`
    return shareContent.timeline(title, { destination: this.data.destinationCode, tripType: this.data.tripType })
  },
  selectLanguage(event) {
    const language = event.currentTarget.dataset.language === 'en' ? 'en' : 'zh'
    if (language === this.data.language) return
    setLanguage(language)
    this.applyLanguage(language)
    loadLatestPublicFares(this, this.data.destinationCode, this.data.tripType, language)
    loadDestinationRankings(this, this.data.tripType)
    wx.setNavigationBarTitle({ title: language === 'en' ? 'Flight Fare Analysis' : '航线价格分析' })
  },
  selectCurrency() {
    const options = currency.getCurrencyOptions(this.data.language)
    wx.showActionSheet({
      itemList: options,
      success: result => {
        const selected = currency.CURRENCIES[result.tapIndex]
        if (!selected) return
        currency.setSelectedCurrency(selected.code)
        this.setData({ displayCurrency: selected.code, currencySymbol: selected.symbol })
        loadLatestPublicFares(this, this.data.destinationCode, this.data.tripType, this.data.language)
      }
    })
  },
  applyLanguage(language) {
    destinations = buildDestinations(this.data.tripType, language)
    const index = destinations.findIndex(item => item.code === this.data.destinationCode)
    const selected = destinations[index >= 0 ? index : 0]
    this.setData({
      language, isEnglish: language === 'en', destinations,
      topDestinations: rankedDestinations(destinations), destinationGroups: buildGroups(destinations),
      destinationLabel: selected.label, destinationIndex: index >= 0 ? index : 0,
      originLabel: language === 'en' ? 'Kuala Lumpur' : '吉隆坡',
      pickerCancel: language === 'en' ? 'Cancel' : '取消', pickerTitle: language === 'en' ? 'Choose a destination' : '选择目的地',
      pickerConfirm: language === 'en' ? 'Done' : '确定', searchPlaceholder: language === 'en' ? 'Search city, pinyin or airport code' : '搜索城市、拼音或机场代码',
      emptyDestination: language === 'en' ? 'No matching destinations' : '没有找到匹配的目的地',
      ...sampleState(this.data.destinationCode, this.data.tripType, language)
    })
  },
  
  selectTripType(event) {
    const tripType = event.currentTarget.dataset.tripType === 'round_trip' ? 'round_trip' : 'one_way'
    const nextDestinations = buildDestinations(tripType, this.data.language)
    destinations = nextDestinations
    const selected = nextDestinations.find(item => item.code === this.data.destinationCode)
    this.setData({
      tripType,
      destinations: nextDestinations,
      topDestinations: rankedDestinations(nextDestinations),
      ...sampleState(this.data.destinationCode, tripType, this.data.language),
      destinationIndex: selected ? nextDestinations.findIndex(item => item.code === selected.code) : 0
    })
    loadLatestPublicFares(this, this.data.destinationCode, tripType, this.data.language)
    loadDestinationRankings(this, tripType)
  },
  openDestinationPicker() {
    this.setData({ showDestinationPicker: true, destinationSearchKeyword: '', pendingDestinationCode: this.data.destinationCode, destinationGroups: buildGroups(destinations) })
  },
  closeDestinationPicker() {
    this.setData({ showDestinationPicker: false, destinationSearchKeyword: '' })
  },
  stopPickerTap() {},
  onDestinationSearchInput(event) {
    const keyword = event.detail.value || ''
    this.setData({ destinationSearchKeyword: keyword, destinationGroups: buildGroups(filterDestinations(keyword)) })
  },
  clearDestinationSearch() {
    this.setData({ destinationSearchKeyword: '', destinationGroups: buildGroups(destinations) })
  },
  selectDestinationCandidate(event) {
    this.setData({ pendingDestinationCode: event.currentTarget.dataset.code })
  },
  confirmDestinationPicker() {
    const index = this.data.destinations.findIndex(item => item.code === this.data.pendingDestinationCode)
    if (index >= 0) this.onDestinationChange({ detail: { value: index } })
    this.setData({ showDestinationPicker: false, destinationSearchKeyword: '' })
  },
  onDestinationChange(event) {
    const index = Number(event.detail.value || 0)
    const destination = this.data.destinations[index]
    this.setData({
      destinationIndex: index, destinationLabel: destination.label, destinationCode: destination.code,
      ...sampleState(destination.code, this.data.tripType, this.data.language)
    })
    loadLatestPublicFares(this, destination.code, this.data.tripType, this.data.language)
  },
  selectDestination(event) {
    const code = event.currentTarget.dataset.code
    const index = this.data.destinations.findIndex(item => item.code === code)
    if (index < 0) return
    const destination = this.data.destinations[index]
    this.setData({
      destinationIndex: index,
      destinationLabel: destination.label,
      destinationCode: destination.code,
      ...sampleState(destination.code, this.data.tripType, this.data.language)
    })
    openDestinationAnalysis(destination.code, this.data.tripType)
  },
  viewAnalysis() {
    openDestinationAnalysis(this.data.destinationCode, this.data.tripType)
  }
})


