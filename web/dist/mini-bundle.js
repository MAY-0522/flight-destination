window.MINI_MODULES={"pages/index/index.js":function(module,exports,require){
const { INTELLIGENCE_DESTINATIONS } = require("utils/destination-config.js")
const { getLanguage, setLanguage } = require("utils/language.js")
const currency = require("utils/currency-config.js")
const shareContent = require("utils/share-content.js")
const sampleIndex = require("utils/sample-index.js")
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



},"utils/destination-config.js":function(module,exports,require){
// utils/destination-config.js

/**
 * =========================================================
 * 机票目的地发现
 * 统一目的地配置
 * =========================================================
 *
 * 这里是整个小程序唯一的目的地数据源。
 *
 * 页面、搜索任务、结果页都不要再自己维护
 * 国家 / 城市 / 机场代码映射。
 *
 * 后续增加目的地，只修改这个文件。
 * =========================================================
 */

const DESTINATIONS = [
  // ================================
  // 新加坡
  // ================================
  {
    code: 'SIN',
    name: '新加坡',
    country: '新加坡',
    countryCode: 'SG',
    region: 'Southeast Asia',
    type: 'country',
    enabled: true
  },

  // ================================
  // 泰国
  // ================================
  {
    code: 'BKK',
    name: '曼谷',
    country: '泰国',
    countryCode: 'TH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'HKT',
    name: '普吉岛',
    country: '泰国',
    countryCode: 'TH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'CNX',
    name: '清迈',
    country: '泰国',
    countryCode: 'TH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },

  // ================================
  // 马来西亚
  // KUL 为固定出发地，因此这里不把 KUL
  // 作为目的地。
  // ================================
  {
    code: 'PEN',
    name: '槟城',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },

  // ================================
  // 印度尼西亚
  // ================================
  {
    code: 'DPS',
    name: '巴厘岛',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'CGK',
    name: '雅加达',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },

  // ================================
  // 越南
  // ================================
  {
    code: 'SGN',
    name: '胡志明市',
    country: '越南',
    countryCode: 'VN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'HAN',
    name: '河内',
    country: '越南',
    countryCode: 'VN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },

  // ================================
  // 菲律宾
  // ================================
  {
    code: 'MNL',
    name: '马尼拉',
    country: '菲律宾',
    countryCode: 'PH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'CEB',
    name: '宿务',
    country: '菲律宾',
    countryCode: 'PH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },

  // ================================
  // 柬埔寨
  // ================================

  {
    code: 'SAI',
    name: '暹粒',
    country: '柬埔寨',
    countryCode: 'KH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  }
,

    { code: 'MYY', name: '美里', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'SBW', name: '诗巫', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'TWU', name: '斗湖', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'SDK', name: '山打根', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'TGG', name: '瓜拉丁加奴', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'KOS', name: '西哈努克市', country: '柬埔寨', countryCode: 'KH', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'PKU', name: '北干巴鲁', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'PLM', name: '巨港', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'PDG', name: '巴东', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'PNK', name: '坤甸', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'UPG', name: '望加锡', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'BPN', name: '巴厘巴板', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'CGY', name: '卡加延德奥罗', country: '菲律宾', countryCode: 'PH', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'TAG', name: '塔比拉兰', country: '菲律宾', countryCode: 'PH', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'ILO', name: '伊洛伊洛', country: '菲律宾', countryCode: 'PH', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'DVO', name: '达沃', country: '菲律宾', countryCode: 'PH', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'BTU', name: '民都鲁', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'LBU', name: '纳闽', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'BTH', name: '巴淡岛', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true },
  { code: 'LPQ', name: '琅勃拉邦', country: '老挝', countryCode: 'LA', region: 'Southeast Asia', type: 'city', enabled: true },

  // Added KUL routes with publicly observed fare samples.
  {
    code: 'KCH',
    name: '古晋',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'BKI',
    name: '亚庇',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'LGK',
    name: '兰卡威',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'JHB',
    name: '新山',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'KNO',
    name: '棉兰',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'LOP',
    name: '龙目岛',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'YIA',
    name: '日惹',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'SUB',
    name: '泗水',
    country: '印度尼西亚',
    countryCode: 'ID',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'DAD',
    name: '岘港',
    country: '越南',
    countryCode: 'VN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'CXR',
    name: '芽庄',
    country: '越南',
    countryCode: 'VN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'PQC',
    name: '富国岛',
    country: '越南',
    countryCode: 'VN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'KTI',
    name: '金边',
    country: '柬埔寨',
    countryCode: 'KH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'VTE',
    name: '万象',
    country: '老挝',
    countryCode: 'LA',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'BWN',
    name: '斯里巴加湾',
    country: '文莱',
    countryCode: 'BN',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'HDY',
    name: '合艾',
    country: '泰国',
    countryCode: 'TH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'KBV',
    name: '甲米',
    country: '泰国',
    countryCode: 'TH',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'AOR',
    name: '亚罗士打',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  {
    code: 'KBR',
    name: '哥打巴鲁',
    country: '马来西亚',
    countryCode: 'MY',
    region: 'Southeast Asia',
    type: 'city',
    enabled: true
  },
  { code: 'KUA', name: '关丹', country: '马来西亚', countryCode: 'MY', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'guandan' },
  { code: 'BTJ', name: '班达亚齐', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'bandayaji' },
  { code: 'BDJ', name: '马辰', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'machen' },
  { code: 'LBJ', name: '拉布安巴焦', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'labuanbajiao' },
  { code: 'SRG', name: '三宝垄', country: '印度尼西亚', countryCode: 'ID', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'sanbaolong' },
  { code: 'DMK', name: '曼谷（廊曼）', country: '泰国', countryCode: 'TH', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'mangulangman' },
  { code: 'RGN', name: '仰光', country: '缅甸', countryCode: 'MM', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'yangguang' },
  { code: 'DIL', name: '帝力', country: '东帝汶', countryCode: 'TL', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'dili' },
  { code: 'DLI', name: '大叻', country: '越南', countryCode: 'VN', region: 'Southeast Asia', type: 'city', enabled: true, pinyin: 'dalat' }
]


// KUL nonstop Southeast Asia airport pool, including seasonal scheduled routes, checked 2026-10-26.
// The home page ranks its top 10 by quote count; route schedules can change and should be rechecked.
const INTELLIGENCE_DESTINATIONS = [
  { code: 'PEN', name: '槟城', country: '马来西亚', airportName: 'Penang International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'SIN', name: '新加坡', country: '新加坡', airportName: 'Singapore Changi Airport', currency: 'SGD', hasAnalysis: true },
  { code: 'BKK', name: '曼谷', country: '泰国', airportName: 'Suvarnabhumi Airport', currency: 'THB', hasAnalysis: true },
  { code: 'HKT', name: '普吉岛', country: '泰国', airportName: 'Phuket International Airport', currency: 'THB', hasAnalysis: true },
  { code: 'CNX', name: '清迈', country: '泰国', airportName: 'Chiang Mai International Airport', currency: 'THB', hasAnalysis: true },
  { code: 'DPS', name: '巴厘岛', country: '印度尼西亚', airportName: 'I Gusti Ngurah Rai International Airport', currency: 'IDR', hasAnalysis: true },
  { code: 'CGK', name: '雅加达', country: '印度尼西亚', airportName: 'Soekarno–Hatta International Airport', currency: 'IDR', hasAnalysis: true },
  { code: 'SGN', name: '胡志明市', country: '越南', airportName: 'Tan Son Nhat International Airport', currency: 'VND', hasAnalysis: true },
  { code: 'HAN', name: '河内', country: '越南', airportName: 'Noi Bai International Airport', currency: 'VND', hasAnalysis: true },
  { code: 'MNL', name: '马尼拉', country: '菲律宾', airportName: 'Ninoy Aquino International Airport', currency: 'PHP', hasAnalysis: true },
  { code: 'KCH', name: '古晋', country: '马来西亚', airportName: 'Kuching International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'BKI', name: '亚庇', country: '马来西亚', airportName: 'Kota Kinabalu International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'LGK', name: '兰卡威', country: '马来西亚', airportName: 'Langkawi International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'JHB', name: '新山', country: '马来西亚', airportName: 'Senai International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'KNO', name: '棉兰', country: '印度尼西亚', airportName: 'Kualanamu International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'LOP', name: '龙目岛', country: '印度尼西亚', airportName: 'Lombok International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'YIA', name: '日惹', country: '印度尼西亚', airportName: 'Yogyakarta International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'SUB', name: '泗水', country: '印度尼西亚', airportName: 'Juanda International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'DAD', name: '岘港', country: '越南', airportName: 'Da Nang International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'CXR', name: '芽庄', country: '越南', airportName: 'Cam Ranh International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'PQC', name: '富国岛', country: '越南', airportName: 'Phu Quoc International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'KTI', name: '金边', country: '柬埔寨', airportName: 'Techo International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'SAI', name: '暹粒', country: '柬埔寨', airportName: 'Siem Reap Angkor International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'VTE', name: '万象', country: '老挝', airportName: 'Wattay International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'BWN', name: '斯里巴加湾', country: '文莱', airportName: 'Brunei International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'CEB', name: '宿务', country: '菲律宾', airportName: 'Mactan-Cebu International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'HDY', name: '合艾', country: '泰国', airportName: 'Hat Yai International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'KBV', name: '甲米', country: '泰国', airportName: 'Krabi International Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'AOR', name: '亚罗士打', country: '马来西亚', airportName: 'Sultan Abdul Halim Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'KBR', name: '哥打巴鲁', country: '马来西亚', airportName: 'Sultan Ismail Petra Airport', currency: 'MYR', hasAnalysis: true },
  { code: 'MYY', name: '美里', country: '马来西亚', airportName: 'Miri Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'meili' },
  { code: 'SBW', name: '诗巫', country: '马来西亚', airportName: 'Sibu Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'shiwu' },
  { code: 'TWU', name: '斗湖', country: '马来西亚', airportName: 'Tawau Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'douhu' },
  { code: 'SDK', name: '山打根', country: '马来西亚', airportName: 'Sandakan Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'shandagen' },
  { code: 'TGG', name: '瓜拉丁加奴', country: '马来西亚', airportName: 'Sultan Mahmud Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'gualadingjiano' },
  { code: 'KOS', name: '西哈努克市', country: '柬埔寨', airportName: 'Sihanouk International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'xihanukeshi' },
  { code: 'PKU', name: '北干巴鲁', country: '印度尼西亚', airportName: 'Sultan Syarif Kasim II International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'beiganbalu' },
  { code: 'PLM', name: '巨港', country: '印度尼西亚', airportName: 'Sultan Mahmud Badaruddin II Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'jugang' },
  { code: 'PDG', name: '巴东', country: '印度尼西亚', airportName: 'Minangkabau International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'badong' },
  { code: 'PNK', name: '坤甸', country: '印度尼西亚', airportName: 'Supadio International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'kundian' },
  { code: 'UPG', name: '望加锡', country: '印度尼西亚', airportName: 'Sultan Hasanuddin International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'wangjiaxi' },
  { code: 'BPN', name: '巴厘巴板', country: '印度尼西亚', airportName: 'Sultan Aji Muhammad Sulaiman Sepinggan Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'balibaban' },
  { code: 'CGY', name: '卡加延德奥罗', country: '菲律宾', airportName: 'Laguindingan Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'kajiayandeaoluo' },
  { code: 'TAG', name: '塔比拉兰', country: '菲律宾', airportName: 'Bohol-Panglao International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'tabiralan' },
  { code: 'ILO', name: '伊洛伊洛', country: '菲律宾', airportName: 'Iloilo International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'yiluoyiluo' },
  { code: 'DVO', name: '达沃', country: '菲律宾', airportName: 'Francisco Bangoy International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'dawo' },
  { code: 'BTU', name: '民都鲁', country: '马来西亚', airportName: 'Bintulu Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'mindulu' },
  { code: 'LBU', name: '纳闽', country: '马来西亚', airportName: 'Labuan Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'nameng' },
  { code: 'BTH', name: '巴淡岛', country: '印度尼西亚', airportName: 'Hang Nadim International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'badandao' },
  { code: 'LPQ', name: '琅勃拉邦', country: '老挝', airportName: 'Luang Prabang International Airport', currency: 'MYR', hasAnalysis: true, pinyin: 'langbolabang' },
  { code: 'KUA', name: '关丹', country: '马来西亚', airportName: 'Sultan Haji Ahmad Shah Airport', currency: 'MYR', pinyin: 'guandan' },
  { code: 'BTJ', name: '班达亚齐', country: '印度尼西亚', airportName: 'Sultan Iskandar Muda International Airport', currency: 'MYR', pinyin: 'bandayaji' },
  { code: 'BDJ', name: '马辰', country: '印度尼西亚', airportName: 'Syamsudin Noor International Airport', currency: 'MYR', pinyin: 'machen' },
  { code: 'LBJ', name: '拉布安巴焦', country: '印度尼西亚', airportName: 'Komodo International Airport', currency: 'MYR', pinyin: 'labuanbajiao' },
  { code: 'SRG', name: '三宝垄', country: '印度尼西亚', airportName: 'Jenderal Ahmad Yani International Airport', currency: 'MYR', pinyin: 'sanbaolong' },
  { code: 'DMK', name: '曼谷（廊曼）', country: '泰国', airportName: 'Don Mueang International Airport', currency: 'THB', pinyin: 'mangulangman' },
  { code: 'RGN', name: '仰光', country: '缅甸', airportName: 'Yangon International Airport', currency: 'MMK', pinyin: 'yangguang' },
  { code: 'DIL', name: '帝力', country: '东帝汶', airportName: 'Presidente Nicolau Lobato International Airport', currency: 'USD', pinyin: 'dili' },
  { code: 'DLI', name: '大叻', country: '越南', airportName: 'Lien Khuong Airport', currency: 'VND', pinyin: 'dalat' }
]


/**
 * 获取当前启用的目的地
 */
function getEnabledDestinations() {
  return DESTINATIONS.filter(
    destination => destination.enabled
  )
}


/**
 * 根据机场代码获取目的地
 */
function getDestinationByCode(code) {
  if (!code) {
    return null
  }

  const normalizedCode =
    String(code).toUpperCase()

  return (
    DESTINATIONS.find(
      destination =>
        destination.code === normalizedCode
    ) || null
  )
}


/**
 * 根据城市名称获取目的地
 */
function getDestinationByName(name) {
  if (!name) {
    return null
  }

  return (
    DESTINATIONS.find(
      destination =>
        destination.name === name
    ) || null
  )
}


/**
 * 获取某个国家下的城市
 */
function getCitiesByCountry(country) {
  if (!country) {
    return []
  }

  return DESTINATIONS.filter(
    destination =>
      destination.country === country &&
      destination.type === 'city'
  )
}


/**
 * 获取所有国家
 *
 * 用于排除目的地 Bottom Sheet 等 UI。
 */
function getCountries() {
  const countries = []

  DESTINATIONS.forEach(
    destination => {
      if (
        !countries.includes(
          destination.country
        )
      ) {
        countries.push(
          destination.country
        )
      }
    }
  )

  return countries
}


/**
 * 获取国家 → 城市结构
 *
 * 示例：
 *
 * {
 *   泰国: [
 *     {...曼谷},
 *     {...普吉岛},
 *     {...清迈}
 *   ]
 * }
 */
function getCountryGroups() {
  const groups = {}

  DESTINATIONS.forEach(
    destination => {
      if (!groups[destination.country]) {
        groups[destination.country] = []
      }

      groups[destination.country].push(
        destination
      )
    }
  )

  return groups
}


/**
 * 根据搜索参数过滤目的地
 *
 * 排除规则：
 *
 * 1. 国家排除优先
 * 2. 城市排除
 * 3. country 类型和 city 类型均支持
 * 4. 不修改原始 DESTINATIONS
 */
function filterDestinations(
  destinations,
  searchParams
) {
  const excluded =
    searchParams &&
    Array.isArray(
      searchParams.excludedDestinations
    )
      ? searchParams.excludedDestinations
      : []

  const excludedNames =
    searchParams &&
    Array.isArray(
      searchParams.excludedDestinationNames
    )
      ? searchParams.excludedDestinationNames
      : []

  return destinations.filter(
    destination => {

      // ========================================
      // 国家级排除
      // ========================================

      if (
        excluded.includes(
          destination.country
        )
      ) {
        return false
      }

      if (
        excludedNames.includes(
          destination.country
        )
      ) {
        return false
      }


      // ========================================
      // 城市级排除
      // ========================================

      if (
        excluded.includes(
          destination.name
        )
      ) {
        return false
      }

      if (
        excludedNames.includes(
          destination.name
        )
      ) {
        return false
      }


      return true
    }
  )
}


/**
 * 获取当前区域的目的地
 */
function getDestinationsByRegion(
  region
) {
  return DESTINATIONS.filter(
    destination =>
      destination.region === region &&
      destination.enabled
  )
}


/**
 * 默认东南亚目的地池
 */
function getSoutheastAsiaDestinations() {
  return getDestinationsByRegion(
    'Southeast Asia'
  )
}


module.exports = {
  DESTINATIONS,
  INTELLIGENCE_DESTINATIONS,

  getEnabledDestinations,
  getDestinationByCode,
  getDestinationByName,
  getCitiesByCountry,
  getCountries,
  getCountryGroups,
  getDestinationsByRegion,
  getSoutheastAsiaDestinations,

  filterDestinations
}

},"utils/language.js":function(module,exports,require){
const STORAGE_KEY = 'appLanguage'

function getLanguage() {
  return wx.getStorageSync(STORAGE_KEY) === 'en' ? 'en' : 'zh'
}

function setLanguage(language) {
  const nextLanguage = language === 'en' ? 'en' : 'zh'
  wx.setStorageSync(STORAGE_KEY, nextLanguage)
  const app = getApp()
  if (app && app.globalData) app.globalData.language = nextLanguage
  return nextLanguage
}

module.exports = { getLanguage, setLanguage }

},"utils/currency-config.js":function(module,exports,require){
// Reference snapshot from Bank Negara Malaysia, 2026-10-23.
// Each value is MYR per one unit of currency; every display conversion passes through CNY.
const RATE_SNAPSHOT = {
  targetCurrency: 'CNY', source: 'Bank Negara Malaysia', date: '2026-10-23',
  myrPerUnit: { MYR: 1, CNY: 0.6121, USD: 4.0848, SGD: 3.1975, THB: 0.121155, IDR: 0.000226, VND: 0.000158, PHP: 0.064397 }
}

const CURRENCIES = [
  { code: 'CNY', symbol: '￥', zh: '人民币', en: 'Chinese yuan', decimals: 2 },
  { code: 'USD', symbol: '$', zh: '美元', en: 'US dollar', decimals: 2 },
  { code: 'MYR', symbol: 'RM', zh: '马币', en: 'Malaysian ringgit', decimals: 2 },
  { code: 'SGD', symbol: 'S$', zh: '新币', en: 'Singapore dollar', decimals: 2 },
  { code: 'THB', symbol: '฿', zh: '泰铢', en: 'Thai baht', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', zh: '印尼盾', en: 'Indonesian rupiah', decimals: 0 }
]
const CURRENCY_BY_CODE = CURRENCIES.reduce((result, item) => { result[item.code] = item; return result }, {})

function validCode(code) { return !!CURRENCY_BY_CODE[code] }
function getSelectedCurrency() {
  if (typeof wx !== 'undefined' && wx.getStorageSync) {
    const saved = wx.getStorageSync('displayCurrency')
    if (validCode(saved)) return saved
  }
  return 'CNY'
}
function setSelectedCurrency(code) {
  const selected = validCode(code) ? code : 'CNY'
  if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync('displayCurrency', selected)
  return selected
}
function toCny(amount, sourceCurrency) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return null
  if (sourceCurrency === 'CNY') return Number(amount)
  const sourceRate = RATE_SNAPSHOT.myrPerUnit[sourceCurrency]
  const cnyRate = RATE_SNAPSHOT.myrPerUnit.CNY
  return sourceRate && cnyRate ? Number(amount) * sourceRate / cnyRate : null
}
function fromCny(amount, targetCurrency) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return null
  if (targetCurrency === 'CNY') return Number(amount)
  const targetRate = RATE_SNAPSHOT.myrPerUnit[targetCurrency]
  const cnyRate = RATE_SNAPSHOT.myrPerUnit.CNY
  return targetRate && cnyRate ? Number(amount) * cnyRate / targetRate : null
}
function convert(amount, sourceCurrency, targetCurrency) {
  return fromCny(toCny(amount, sourceCurrency), targetCurrency)
}
function formatNumber(amount, code) {
  const info = CURRENCY_BY_CODE[code] || CURRENCY_BY_CODE.CNY
  const value = Number(amount)
  if (!Number.isFinite(value)) return '—'
  const fixed = value.toFixed(info.decimals)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}
function format(amount, sourceCurrency, targetCurrency) {
  const code = targetCurrency || getSelectedCurrency()
  const value = convert(amount, sourceCurrency || 'CNY', code)
  return value === null ? '—' : `${CURRENCY_BY_CODE[code].symbol} ${formatNumber(value, code)}`
}
function formatCny(amount, sourceCurrency) { return formatNumber(convert(amount, sourceCurrency || 'CNY', 'CNY'), 'CNY') }
function getCurrencyOptions(language) {
  return CURRENCIES.map(item => `${item.code} · ${language === 'en' ? item.en : item.zh}`)
}
function description(sourceCurrency, targetCurrency) {
  const source = sourceCurrency || 'CNY'
  const target = targetCurrency || getSelectedCurrency()
  const rate = convert(1, source, target)
  if (rate === null) return `参考汇率来源：${RATE_SNAPSHOT.source}（${RATE_SNAPSHOT.date}）`
  const prefix = source === target ? '' : `${source} 1 = ${CURRENCY_BY_CODE[target].symbol} ${formatNumber(rate, target)}；`
  return `${prefix}统一以人民币为换算基准；参考汇率：${RATE_SNAPSHOT.source}（${RATE_SNAPSHOT.date}）`
}

module.exports = { RATE_SNAPSHOT, CURRENCIES, toCny, fromCny, convert, formatNumber, format, formatCny, description, getSelectedCurrency, setSelectedCurrency, getCurrencyOptions }

},"utils/share-content.js":function(module,exports,require){
const { getLanguage } = require("utils/language.js")
const currency = require("utils/currency-config.js")

function serializeQuery(extra) {
  const values = Object.assign({
    language: getLanguage(),
    currency: currency.getSelectedCurrency()
  }, extra || {})
  return Object.keys(values)
    .filter(key => values[key] !== undefined && values[key] !== null && values[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(values[key])}`)
    .join('&')
}

function appMessage(title, path, extra) {
  const query = serializeQuery(extra)
  return { title, path: query ? `${path}?${query}` : path }
}

function timeline(title, extra) {
  return { title, query: serializeQuery(extra) }
}

module.exports = { appMessage, timeline }

},"utils/sample-index.js":function(module,exports,require){
const BASELINE = require("utils/sample-index-data.js")

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

},"utils/sample-index-data.js":function(module,exports,require){
module.exports = {"one_way":{"AOR":{"keys":["39b733378fd669d9","aa38bd09f9bc2b03","a434e200fbb9ef92","a83af87af7b3d918","aa2e2fadf9b19da7","d4809eb97f82a727"],"dates":["2026-11-09","2026-11-10","2026-11-11","2026-11-13","2026-11-14","2027-02-23"],"collectionDates":["2026-10-26"]},"BDJ":{"keys":["ea67e5e85d611822","f29cf93bcb7bfc81","9b9e2a3a26152108","77b3cd9ffa894769","e5e732878676aa31","8b2b496b29a74985","4a93247880abe0da","ee61dc065952074c"],"dates":["2026-11-12","2026-11-14","2026-12-01","2027-01-12","2027-02-16","2027-03-02","2027-04-10","2027-06-24"],"collectionDates":["2026-10-26"]},"BKI":{"keys":["b7c80e02a829bca8","471f74c03f812ffe","4d21bcc93d836b6f","4b23f83a3b7cac84","4714e7643f8bbd5a"],"dates":["2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-14"],"collectionDates":["2026-10-26"]},"BKK":{"keys":["1b7a6e24f4e778d2","055e8f23876798e1","be532e5ff3bbfcc9","bc6a8488f1c8c596","c26ccc91efcb0107"],"dates":["2026-11-10","2026-11-12","2026-11-27","2026-11-28","2026-11-29"],"collectionDates":["2026-10-26"]},"BPN":{"keys":["c2440ce5d0914dd3","bc41c4dcd28f1262","55e6aea163ed380b","51e0982767de33cd"],"dates":["2026-11-08","2026-11-09","2026-11-13","2026-11-15"],"collectionDates":["2026-10-26"]},"BTH":{"keys":["6a63ac6e0ce908a8","6a81c1820ccaf394","ffdb7049a24d44cb","fbdfe72ba6473ae9","ffd275eda242b76f"],"dates":["2026-11-05","2026-11-09","2026-11-11","2026-11-13","2026-11-15"],"collectionDates":["2026-10-26"]},"BTJ":{"keys":["085e1226a187ab50","d9e44833f4e202f1","33ca4469641f4ab7","faf23eb72cf993d9","6ad3b64e3f30ddd8","75ac1d4cef0d1b5e","86cced06f5729dac","fcda5045d16ecc53","c1d1e809be73b923","e3fdc3508c6c0e46"],"dates":["2026-11-23","2026-12-01","2027-01-20","2027-02-16","2027-03-03","2027-04-04","2027-05-12","2027-06-10","2027-07-31","2027-09-29"],"collectionDates":["2026-10-26"]},"BTU":{"keys":["0a8ccc66fa915d04","0a9759c2fa9a5760","9de8b69e8cce27d0","9fe67b2d8ed4e6bb","5702c03f5080ca6d"],"dates":["2026-11-03","2026-11-07","2026-11-14","2026-11-17","2027-02-20"],"collectionDates":["2026-10-26"]},"BWN":{"keys":["58b9579844006c0e","58b05d3c4409666a","5ab71c2746072af9","eae29aacd76fddfe","8046d6cf1f3a3bd1"],"dates":["2026-11-01","2026-11-05","2026-11-06","2026-11-12","2026-11-24"],"collectionDates":["2026-10-26"]},"CEB":{"keys":["3686ab727ae1c42c","388470017cea1617","cbf574f1104efaab","c9ed23060e3dae64","c5de1230126046f2"],"dates":["2026-11-01","2026-11-02","2026-11-11","2026-11-16","2026-11-18"],"collectionDates":["2026-10-26"]},"CGK":{"keys":["a354331de5748583","a158018ee36c3398","9f5a3cffe9700ea1","9d5c7870e767bcb6","a35ec079e569f827","a160fbeae363393c","9f63375be9658145","9d6572cce75ec25a","a3694dd5e560fdcb","0be9380f55b9e52d","0de6fc9e4fb79d24","0fe4c12d51be5c0f","09e2792453bc209e","0bf3c56b55c47289","0df189fa4fc09780","0fef4e8951c8e96b","09eb738053c6adfa","0bfe52c755cd6ce5","0dfa84564fcb24dc","7a80850a09067b9c","7884537b0f08c3a5","767c01900d0aff16","7c7e49990b0d3a87","7a778aae090f75f8","7879c61f0f11be01","767307340d13f972","7c754f3d0b17c7e3","7a959fc208f160e4","7897db330ef53bed","ea550685779dc897"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"CGY":{"keys":["b5b8075eca0bca54","b7b5cbedcc12893f","b3c33d2bd0170cb9","b5c101baca14c4b0","b7bec649cc1d169b","452bf030607eb566","4b2e38395e80f0d7","4734421b627c79f5","8c23c93cf3ee2756","92309ea1f1faf023"],"dates":["2026-11-01","2026-11-02","2026-11-04","2026-11-05","2026-11-06","2026-11-14","2026-11-15","2026-11-17","2026-11-21","2026-11-24"],"collectionDates":["2026-10-26"]},"CNX":{"keys":["9113366399785319","930f67f293760b10","950d2c81957e5cfb","90f5214f9982e075","92f2e5de9380986c","22715c0c2b262aa2","2675df862721a728","24781af72d23ef31","227be9682b1d3046","287e3171291f6bb7","26806ce2271719cc","28601c5d2914de5b","6b2acf7fc08a66c5","6d28940eba881ebc","6f2f52f9bc996b03","6b33c9dbc094f421","6f39e055bc7b55ef","6936054cbe791a7e","ff9ff6024cba5c2c"],"dates":["2026-11-04","2026-11-05","2026-11-06","2026-11-08","2026-11-09","2026-11-10","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-19","2026-11-22","2026-11-23","2026-11-24","2026-11-26","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"CXR":{"keys":["18128baf41582db1","1c2009853d491cdb","84a186bfada3973d","889d0fdda9a80e1f","84ac141badac9199"],"dates":["2026-11-03","2026-11-09","2026-11-10","2026-11-12","2026-11-14"],"collectionDates":["2026-10-26"]},"DAD":{"keys":["7c4972ddd3cd902b","7a563baad1bc43e4","7c526d39d3c495cf","e8e2fb49405e1e3b","e8da00ed405390df"],"dates":["2026-11-03","2026-11-04","2026-11-07","2026-11-10","2026-11-14"],"collectionDates":["2026-10-26"]},"DLI":{"keys":["cb80bfa3b2d61c15"],"dates":["2027-03-03"],"collectionDates":["2026-10-26"]},"DMK":{"keys":["1ce06701d5b830bf","965bd603738a7c75","1c7ab796b439ebbc","8936107f4d6a4249","9c6c3ebd99f91a67","c03def64461d89ea","3d42c7ac75ff111a","d7e752c2c8b32074","704a9c845d4122ae","e03e604532379853","7e1e25a3a42161d5"],"dates":["2026-11-26","2026-12-22","2027-01-26","2027-02-25","2027-03-01","2027-04-17","2027-05-05","2027-06-06","2027-07-03","2027-08-12","2027-09-08"],"collectionDates":["2026-10-26"]},"DPS":{"keys":["e918b9f950379d6f","e71af56a4e30de84","e51d30db5433268d","e30be494523fef5a","e90e2c9d50422acb","e711fb0e4e39d8e0","e514367f543c20e9","e329f9a85248e9b6","e92c41b1504b2527","51adbeebc0ccaef9","53ab837abaca66f0","55a94809bcd125db","4fa56d00beceea6a","51a3318fc0c2219d","53a0f61ebabfd994","559ebaadbcc82b7f","4f9c72a4bec5f00e","51c146a3c0e036b1","53bf0b32baddeea8","c0450be674194568","be4747577a1b8d71","bc40886c781dc8e2","c242d07576200453","c04f9942740eb80c","be51d4b37a110015","bc4982c878133b86","c24bcad1761576f7","c031842e74042ab0","be33bf9f7a0672b9","30198d61e2b09263"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"DVO":{"keys":["ecbc3c207b36dad2","f2be842979391643"],"dates":["2026-12-14","2026-12-15"],"collectionDates":["2026-10-26"]},"HAN":{"keys":["ec4c2f421c9f8a44","ee4860d11ea7dc2f","e84618c820a40dbe","ea43dd5722ac5fa9","ec41a1e61caa17a0","ee3f66751eb0d68b","e83d1e6c20ae9b1a","ea3ae2fb22b55a05","ec37148a1cb311fc","7bb71db8b31d02b2","81b965c1b11f3e23","7fbba132af187f38","7dbddca3b51ac741","7bac905cb3127556","81aed865b11643c7","7fb113d6af0df1dc","7db4e247b51039e5","7ba20300b3097afa","81a5de09b10bb66b","c86a87494485b5b7","c2683f4046837a46","c46efe2b48813ed5","c66cc2ba427d63cc","c8618ced448eb013","c25db1e4468c74a2","c46603cf488a3931","c663c85e4287f128","c87e0f0144722dff","c27bc6f8466ff28e","59d33a4ed5ee68bc"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"HDY":{"keys":["b880c44079bb87c6","ba87832b7bb94c55","b8944bf879a8000e","4febbf4e0926763c","4dedfabf0f28be45"],"dates":["2026-11-01","2026-11-02","2026-11-09","2026-11-10","2026-11-11"],"collectionDates":["2026-10-26"]},"HKT":{"keys":["40c9cb62da7b14c4","42c78ff1dc8366af","3cc547e8de7f983e","3ec17977e087ea29","40bf3e06da85a220","42bd0295dc8c610b","3cbaba8cde8a259a","3eb87f1be090e485","40b643aada8e9c7c","d4393d526cf409b8","d23b78c372f651c1","d02a2c7c70edffd6","d62c74856ef1ce47","d43042f66ce97c5c","d2327e6772ebc465","d021322070e5057a","d6237a296ee740eb","16e5db60045f04c6","18ee2d4b065cc955","1aebf1da0058ee4c","1cdf290d026a3a93","16dce1040467ff22","18e39fef0665c3b1","1cfd3e21024db87f","16f96318044b7d0e","ad13a1ee93c9f33c"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"ILO":{"keys":["8e606de534d24113","f7000033f1ccf6c9","faf9f651edd16dab","f8f33766ebc02164","f4eeb3ecefc637de","faf0fbf5edc8734f","6882945d5a61fbbb"],"dates":["2026-11-12","2026-11-21","2026-11-23","2026-11-24","2026-11-26","2026-11-27","2026-11-30"],"collectionDates":["2026-10-26"]},"JHB":{"keys":["c0529e9cb230c9ea","c4572216ae2c4670","c05b98f8b227cf8e","57bd99aa419bb860","57d1216241af4018"],"dates":["2026-11-01","2026-11-03","2026-11-05","2026-11-10","2026-11-18"],"collectionDates":["2026-10-26"]},"KBR":{"keys":["315d96370a2ca351","2f55444c083071c2","35591f550632ad33","33645522042160ec","316690930a23a8f5"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05"],"collectionDates":["2026-10-26"]},"KBV":{"keys":["4239de8ccdf5fb7e","444b2ad3cffcba69","4846b3f1cc02c44b","42446be8ce0088da","d5a9507c606d5d72"],"dates":["2026-11-03","2026-11-04","2026-11-06","2026-11-07","2026-11-10"],"collectionDates":["2026-10-26"]},"KCH":{"keys":["f1eacf70a0be77fa","f7ed17799ec0b36b","f5ef52ea9cb86180","f1e04214a0b3ea9e","f1fe5728a0d1ffb2"],"dates":["2026-11-10","2026-11-11","2026-11-12","2026-11-14","2026-11-18"],"collectionDates":["2026-10-26"]},"KNO":{"keys":["ab960f5cccb74e52","ada75ba3ceaa8585","f455abf86fa51da2"],"dates":["2026-11-03","2026-11-04","2027-03-02"],"collectionDates":["2026-10-26"]},"KOS":{"keys":["992457d3d7b74591","dfcc7eff6b132fc9","7441a582f88059b0"],"dates":["2026-11-17","2026-11-22","2026-11-30"],"collectionDates":["2026-10-26"]},"KTI":{"keys":["1a42baa8bb893496","2026ed9db980e2ab","88d10d472b18918d"],"dates":["2026-11-04","2026-11-09","2026-11-10"],"collectionDates":["2026-10-26"]},"KUA":{"keys":["232728c5b423ac1b"],"dates":["2027-02-18"],"collectionDates":["2026-10-26"]},"LBU":{"keys":["6281caf999aef387","6084066a97a8349c","a97811052d0addbf","a57e1ae7310666dd"],"dates":["2026-11-11","2026-11-12","2026-11-24","2026-11-26"],"collectionDates":["2026-10-26"]},"LGK":{"keys":["0ba20fa7611f26a5","0d9fd4365b1cde9c","0bac9d0361282101","09a44b185f2a5c72","762a4bcc1829890a"],"dates":["2026-11-10","2026-11-11","2026-11-14","2026-11-17","2026-11-26"],"collectionDates":["2026-10-26"]},"LOP":{"keys":["202aead725349bd9","1e242bec2336d74a","221e220a1f3b4e2c","8bb5c45490fa0c7e","8bbebeb0910499da"],"dates":["2026-11-05","2026-11-06","2026-11-08","2026-11-11","2026-11-15"],"collectionDates":["2026-10-26"]},"LPQ":{"keys":["04cfab583ebc9702","c1d35b6aa83f1e94","ee961852ce9af3b8"],"dates":["2026-11-11","2026-11-22","2026-12-01"],"collectionDates":["2026-10-26"]},"MNL":{"keys":["1c72b7b614d87fd0","aa8ce9f4ac570296","b08f31fdaa593e07","ae916d6ea8527f1c","ac93a8dfae54c725","b099bf59aa63cb63","b0a2b9b5aa45b64f","f79005653dbfb59b","f59240d63bb763b0"],"dates":["2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-15","2026-11-19","2026-11-20","2026-11-23"],"collectionDates":["2026-10-26"]},"MYY":{"keys":["7f4e75f4669e8b22","815fc23b68935555","12bde7e4fa0502b6","16c3fe5ef6007f3c","59c948a88c23b86e"],"dates":["2026-11-03","2026-11-04","2026-11-10","2026-11-12","2026-11-25"],"collectionDates":["2026-10-26"]},"PDG":{"keys":["eaff2a32dbc0f564","ecfceec1ddc9474f","e6faa6b8dfc70bde","e8f86b47e1cdcac9","ecf26165ddd241ab"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-06"],"collectionDates":["2026-10-26"]},"PEN":{"keys":["bbf2e58be6bd8f19","b9f520fce4ca57e6","bff76905e2cc9357","2878e63f548b51a9","2a76aace4e8909a0","0b437818f8d6cb06","0d4bca03fad48f95","0f498e92f4d2478c","113cc5c5f6e393d3","0b3a7dbcf8e15862","0d413ca7fadf1cf1","0f3f0136f4dcd4e8","11323869f6c57ebf","0b2ff060f8c3434e","a1713ea68841b97c","9f750d178e440185","9d6cbb2c8c47cff6","a36f03358a4a0b67","a17bcc02884c46d8","9f7e07738e4e8ee1","9d7748888c50ca52","a37990918a5305c3","a15db6ee882e31c4","9f5ff25f8e3079cd","32d9f1abd4f6b60d","34d7b63acef46e04","36d57ac9d0fb2cef","30d332c0d2f8f17e","32d0f74fd4ffb069","34cebbdecefd6860","36cc806dd105ba4b","30c8a564d3037eda","32ef0c63d50a3dc5","34eb3df2cf07f5bc","c442a4b065705372","36fdd595761a102b","350a9e627408c3e4","0f2cc4da99e8306c","111ffc0d9bf97cb3","79b500ff0db6a805","31061ae8780eda5e","330cd9d37a0c9eed","0d2f004b9fea7875"],"dates":["2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"PKU":{"keys":["6a91cdae914e7d5c","6c8f923d9356cf47","668d4a34955300d6","689e967b975b52c1","6c988c99935fc9a3"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-06"],"collectionDates":["2026-10-26"]},"PLM":{"keys":["c1ae9d466ba727ec","c3b55c316db87433","bfb9d31371b26a51","c1b797a26bb02248","c397471d6d9a5f1f"],"dates":["2026-11-03","2026-11-04","2026-11-06","2026-11-07","2026-11-08"],"collectionDates":["2026-10-26"]},"PNK":{"keys":["e2395516fe72ce3c","e22ec7bafe6840e0","e031032b046a88e9","73ab02774b30c529","75a8c706452e7d20"],"dates":["2026-11-14","2026-11-18","2026-11-19","2026-11-20","2026-11-21"],"collectionDates":["2026-10-26"]},"PQC":{"keys":["b0bec5db4f5b2435","aeb806f04d5d5fa6","b4ba4ef94b612e17","b2b3900e49636988","1f60a032b72f9918"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-17"],"collectionDates":["2026-10-26"]},"RGN":{"keys":["2318d95919871be3"],"dates":["2027-02-21"],"collectionDates":["2026-10-26"]},"SAI":{"keys":["801b87dab9368ffc","7e1335efbf436561","1440fc7d4d711f57","124dc54a4b735ac8","144b89d94d7bacb3"],"dates":["2026-11-03","2026-11-06","2026-11-13","2026-11-14","2026-11-17"],"collectionDates":["2026-10-26"]},"SBW":{"keys":["6f643a826d1b3f04","6f46256e6d37c118","fec62e9c0351ffee","02d3ac72ff5809d0","04b4eeed01695617"],"dates":["2026-11-05","2026-11-09","2026-11-10","2026-11-16","2026-11-19"],"collectionDates":["2026-10-26"]},"SDK":{"keys":["ed53c1ecc460e5e6","ef650e33c667a4d1","80afac2457dae532","c7745564eb2dd50e","cd812ac9e9390adb"],"dates":["2026-11-03","2026-11-04","2026-11-18","2026-11-21","2026-11-24"],"collectionDates":["2026-10-26"]},"SGN":{"keys":["448038908b4f0756","46888a7b8d4ccbe5","4884bc0a874a83dc","4a79863d895bd023","44773e348b5994b2","467dfd1f8d575941","487bc1ae87551138","4a960851893dbb0f","4493c0488b3b7f9e","dbeb339e1ab9f5cc","d9ed6f0f20bdd0d5","d7e6b0241ec00c46","dde8f82d1cc247b7","dbf5c0fa1ac48328","d9f7fc6b20c6cb31","d7efaa801ec906a2","ddf385891ccb4213","dbfebb561aa66e14","da0289c720a8b61d","6da39883676ef25d","6fa15d12616caa54","719f21a16373693f","6b9b469865712dce","6d990b276777ecb9","6f96cfb66175a4b0","71949445637df69b","6b924c3c657bbb2a","6d9010cb67827a15","6f8dd55a6180320c","fdcf1708f7ea22c2"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"SIN":{"keys":["310fa86d8369b803","2f11e3de81616618","2d141f4f87654121","2b165ac0855cef36","3118a2c9835f2aa7","2f1ade3a81586bbc","2d1d19ab875ab3c5","2b20e81c8553f4da","312330258356304b","99a31a5ff3af17ad","9ba0deeeedaccfa4","9d9ea37defb38e8f","979c5b74f1b1531e","99ada7bbf3b9a509","9bab6c4aedb5ca00","9da930d9efbe1beb","97a6e8d0f1bbe07a","99b83517f3c29f65","9bb466a6edc0575c","09792edaa6fbae1c","077b6a4bacfdf625","05731860ab003196","0b756069a9026d07","096ea17ea704a878","0770dcefad06f081","056a1e04ab092bf2","0b6c660da90cfa63","098cb692a6e69364","078ef203acea6e6d","78107bd51592fb17"],"dates":["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14","2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20","2026-11-21","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26","2026-11-27","2026-11-28","2026-11-29","2026-11-30"],"collectionDates":["2026-10-26"]},"SRG":{"keys":["43a4d3743033e57a","c1b543701bf31c5e","8c270b5a37765b54","0fc357443a33b2ba","fe0f87966af52594","0bf19dc83cef4726","833feefe888aa12c","baf26d7a25791394","b18d4ee082bf4bc2","d0ea2398207c4166"],"dates":["2026-11-18","2026-12-02","2027-01-12","2027-02-02","2027-03-29","2027-04-08","2027-05-01","2027-06-08","2027-08-17","2027-09-10"],"collectionDates":["2026-10-26"]},"SUB":{"keys":["a7d2e06d284a8a63","a7ef6281282c754f","c08a5d37f4792711"],"dates":["2026-11-24","2026-11-28","2027-08-02"],"collectionDates":["2026-10-26"]},"TAG":{"keys":["eca4dc1b35f074a1","1071695c0ccd14ae"],"dates":["2026-11-06","2026-11-23"],"collectionDates":["2026-10-26"]},"TGG":{"keys":["b9612420f3e972fa","bd65a79aefe35c80","bf58decdf1e1210f","bd5b1a3eefda6224","4b8a67348758e4ea"],"dates":["2026-11-01","2026-11-03","2026-11-04","2026-11-07","2026-11-12"],"collectionDates":["2026-10-26"]},"TWU":{"keys":["8942584ba3b8dd3d","8b358f7e9dbf8f90","fb14955fba135afd"],"dates":["2026-11-12","2026-11-13","2026-11-17"],"collectionDates":["2026-10-26"]},"UPG":{"keys":["d56281ecc6f14e4a","d97192c2c2e23d74","db6dc451c4e8fc5f","d56b7c48c6e6c0ee","d755b91fc9029a91"],"dates":["2026-11-03","2026-11-05","2026-11-06","2026-11-07","2026-11-08"],"collectionDates":["2026-10-26"]},"VTE":{"keys":["37528646fe8a1064","3356fd280299213a","cab8fdda91fb1554","c6b2e76095ff98ce","caae707e92040fb0"],"dates":["2026-11-03","2026-11-05","2026-11-10","2026-11-12","2026-11-14"],"collectionDates":["2026-10-26"]},"YIA":{"keys":["5efd2fd543ea659f","58f954cc45e82a2e","5f062a3143f4f2fb","17fc5c6db1c1228b","12030ec0b3b459be"],"dates":["2026-11-10","2026-11-11","2026-11-14","2026-11-21","2026-11-24"],"collectionDates":["2026-10-26"]}},"round_trip":{"AOR":{"keys":["e485557f80f4e1d9"],"dates":["2027-07-10"],"collectionDates":["2026-10-26"]},"BKI":{"keys":["8743eba6eb4c4380"],"dates":["2026-12-11"],"collectionDates":["2026-10-26"]},"BKK":{"keys":["958c19f595020347"],"dates":["2027-02-18"],"collectionDates":["2026-10-26"]},"BPN":{"keys":["5cbaa2f9385a7f17"],"dates":["2026-11-13"],"collectionDates":["2026-10-26"]},"BTH":{"keys":["5367f0ece067bcf2"],"dates":["2026-11-12"],"collectionDates":["2026-10-26"]},"BTU":{"keys":["a3ff3bf3f95f2ca9","210b602ee01d8bc4","22f8efe4c8c934c2","1298d26b81d31ed9","7cf00984906aa966","8c01c2488007da22"],"dates":["2026-11-08","2026-12-03","2027-02-18","2027-03-20","2027-04-28","2027-07-16"],"collectionDates":["2026-10-26"]},"BWN":{"keys":["392f63f851ba925a"],"dates":["2027-01-15"],"collectionDates":["2026-10-26"]},"CEB":{"keys":["98abb3a059a06a92"],"dates":["2027-03-18"],"collectionDates":["2026-10-26"]},"CGK":{"keys":["9863bffdc886ce57"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"CGY":{"keys":["debd776897d1733a"],"dates":["2026-11-16"],"collectionDates":["2026-10-26"]},"CNX":{"keys":["701c17bd16a0746f"],"dates":["2026-11-11"],"collectionDates":["2026-10-26"]},"CXR":{"keys":["b865d1e4fddbed1e"],"dates":["2026-11-14"],"collectionDates":["2026-10-26"]},"DAD":{"keys":["dc60f6da1be537f0"],"dates":["2026-11-25"],"collectionDates":["2026-10-26"]},"DMK":{"keys":["0790c4a1660ec583","52d659b1b0e77033","3ddf9484700a9056","ac1c3b9ecc45c490","90094d1aa0933b5c","790833e3cd203199"],"dates":["2026-11-28","2026-12-01","2027-02-18","2027-02-25","2027-04-29","2027-07-21"],"collectionDates":["2026-10-26"]},"DPS":{"keys":["061295a39450334d"],"dates":["2026-11-19"],"collectionDates":["2026-10-26"]},"DVO":{"keys":["b4c86c1480ed5866"],"dates":["2027-02-21"],"collectionDates":["2026-10-26"]},"HAN":{"keys":["0f043a53af7ac479"],"dates":["2027-03-29"],"collectionDates":["2026-10-26"]},"HDY":{"keys":["e82c0cfb2643a729"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"HKT":{"keys":["0cfae41641f2ab2c"],"dates":["2026-11-22"],"collectionDates":["2026-10-26"]},"ILO":{"keys":["8fe2f07dccdde87b"],"dates":["2026-11-11"],"collectionDates":["2026-10-26"]},"JHB":{"keys":["73cdb92467d57722"],"dates":["2026-11-27"],"collectionDates":["2026-10-26"]},"KBR":{"keys":["1e68a25586742adb"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"KBV":{"keys":["f3bf8be6d95cfa68"],"dates":["2027-02-25"],"collectionDates":["2026-10-26"]},"KCH":{"keys":["a3c9d80ef58182ac"],"dates":["2026-11-13"],"collectionDates":["2026-10-26"]},"KNO":{"keys":["96836ee3363cfacd","0f4baa4eded57c70"],"dates":["2026-11-19","2027-01-22"],"collectionDates":["2026-10-26"]},"KOS":{"keys":["7f0efe8d5557ace3"],"dates":["2026-12-15"],"collectionDates":["2026-10-26"]},"KUA":{"keys":["b07b043ecd57bf50","04b3950e46dad7e0","cef4591d6a4316c7","a5c658546e15efb2"],"dates":["2026-12-09","2026-12-16","2027-02-18","2027-02-22"],"collectionDates":["2026-10-26"]},"LBU":{"keys":["c9957272621f8a08"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"LGK":{"keys":["e0427248c20a3d6a"],"dates":["2026-11-26"],"collectionDates":["2026-10-26"]},"LOP":{"keys":["6206047920b3ba6b"],"dates":["2026-11-16"],"collectionDates":["2026-10-26"]},"LPQ":{"keys":["32192949786e9cdb"],"dates":["2026-10-30"],"collectionDates":["2026-10-26"]},"MNL":{"keys":["602171d6a6b2ae98"],"dates":["2026-11-05"],"collectionDates":["2026-10-26"]},"MYY":{"keys":["d73ecaa626a1f408"],"dates":["2027-01-13"],"collectionDates":["2026-10-26"]},"PDG":{"keys":["7fb98d8a3bcf51e8"],"dates":["2026-12-01"],"collectionDates":["2026-10-26"]},"PEN":{"keys":["213e9d19ce7f928b","6624f2d22decc3ec","191ff01efdc408b8","32de02da614321f0","24ddecd06f4337fa","5996cb06e77e9380","d8ddbe51b39b7033"],"dates":["2026-11-01","2026-11-04","2026-11-05","2026-11-08","2026-11-28","2026-11-30"],"collectionDates":["2026-10-26"]},"PKU":{"keys":["9d7405b7c568c805"],"dates":["2026-11-06"],"collectionDates":["2026-10-26"]},"PLM":{"keys":["51f517f320ddc5cd"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"PNK":{"keys":["7c2050a8b313627a"],"dates":["2026-11-19"],"collectionDates":["2026-10-26"]},"PQC":{"keys":["c10c2c13a5f512a1"],"dates":["2026-12-01"],"collectionDates":["2026-10-26"]},"RGN":{"keys":["e216a82e45c0fe8c","b006c7fda93ce927","032cfa758a8ab8f3","dfca017504f9b99f","c3d5ee9a9590d880","ccb46c69a76849bf"],"dates":["2027-01-16","2027-01-30","2027-02-14","2027-02-19","2027-02-21","2027-02-28"],"collectionDates":["2026-10-26"]},"SAI":{"keys":["4e13aed7affbc079"],"dates":["2026-11-09"],"collectionDates":["2026-10-26"]},"SBW":{"keys":["4ce9d7a974a83b8f"],"dates":["2027-05-04"],"collectionDates":["2026-10-26"]},"SDK":{"keys":["1ef023955df5e3b7"],"dates":["2027-02-18"],"collectionDates":["2026-10-26"]},"SGN":{"keys":["948758ddff2f8d0b"],"dates":["2027-05-17"],"collectionDates":["2026-10-26"]},"SIN":{"keys":["b1994f6bc2eddf2d"],"dates":["2027-04-16"],"collectionDates":["2026-10-26"]},"SUB":{"keys":["65c3441f10d2e6e5","ff2515b6ca1d4b1c","223ed1d89c871f8a"],"dates":["2026-11-10","2027-02-17","2027-05-19"],"collectionDates":["2026-10-26"]},"TWU":{"keys":["b8cf382757bbe7c9","d30c1c977ebe2b9d","6a2955f379cb1ce5","b886b38dcd04b363","451ceff2f03a1e98","a39966f27c5b5d28","952700331f075bd1","c1e763ac75ab8f02"],"dates":["2026-11-11","2026-11-13","2026-11-21","2026-11-26","2026-11-28","2026-12-03","2027-01-15","2027-01-17"],"collectionDates":["2026-10-26"]},"UPG":{"keys":["20597de58c781eaf"],"dates":["2026-11-09"],"collectionDates":["2026-10-26"]},"VTE":{"keys":["359a102ab1328010"],"dates":["2026-11-10"],"collectionDates":["2026-10-26"]},"YIA":{"keys":["f277ffc5ad3739bf"],"dates":["2026-11-05"],"collectionDates":["2026-10-26"]}}}

},"price-intelligence/pages/insights/insights.js":function(module,exports,require){
const ROUTE_REPORTS = require("price-intelligence/route-reports.js")
const ROUND_TRIP_REPORTS = require("price-intelligence/round-trips/route-reports.js")
const ROUTE_OBSERVATIONS = require("price-intelligence/observation-index.js")
const { analyzeWithLiveFares } = require("price-intelligence/live-route-analysis.js")
const PUBLIC_FARES_URL = 'https://flight-destination-api.xu5lu2yi2.workers.dev'
const currency = require("utils/currency-config.js")
const { INTELLIGENCE_DESTINATIONS } = require("utils/destination-config.js")
const DESTINATION_BY_CODE = INTELLIGENCE_DESTINATIONS.reduce((map, item) => { map[item.code] = item; return map }, {})
const { getLanguage, setLanguage } = require("utils/language.js")
const shareContent = require("utils/share-content.js")
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






},"price-intelligence/route-reports.js":function(module,exports,require){
// Generated by analyze-routes.js; static requires are compatible with WeChat Mini Program bundling.
module.exports = {
  "PEN": require("price-intelligence/kul-pen/analysis-data.js"),
  "AOR": require("price-intelligence/routes/aor/analysis-data.js"),
  "BDJ": require("price-intelligence/routes/bdj/analysis-data.js"),
  "BKI": require("price-intelligence/routes/bki/analysis-data.js"),
  "BKK": require("price-intelligence/routes/bkk/analysis-data.js"),
  "BPN": require("price-intelligence/routes/bpn/analysis-data.js"),
  "BTH": require("price-intelligence/routes/bth/analysis-data.js"),
  "BTJ": require("price-intelligence/routes/btj/analysis-data.js"),
  "BTU": require("price-intelligence/routes/btu/analysis-data.js"),
  "BWN": require("price-intelligence/routes/bwn/analysis-data.js"),
  "CEB": require("price-intelligence/routes/ceb/analysis-data.js"),
  "CGK": require("price-intelligence/routes/cgk/analysis-data.js"),
  "CGY": require("price-intelligence/routes/cgy/analysis-data.js"),
  "CNX": require("price-intelligence/routes/cnx/analysis-data.js"),
  "CXR": require("price-intelligence/routes/cxr/analysis-data.js"),
  "DAD": require("price-intelligence/routes/dad/analysis-data.js"),
  "DLI": require("price-intelligence/routes/dli/analysis-data.js"),
  "DMK": require("price-intelligence/routes/dmk/analysis-data.js"),
  "DPS": require("price-intelligence/routes/dps/analysis-data.js"),
  "DVO": require("price-intelligence/routes/dvo/analysis-data.js"),
  "HAN": require("price-intelligence/routes/han/analysis-data.js"),
  "HDY": require("price-intelligence/routes/hdy/analysis-data.js"),
  "HKT": require("price-intelligence/routes/hkt/analysis-data.js"),
  "ILO": require("price-intelligence/routes/ilo/analysis-data.js"),
  "JHB": require("price-intelligence/routes/jhb/analysis-data.js"),
  "KBR": require("price-intelligence/routes/kbr/analysis-data.js"),
  "KBV": require("price-intelligence/routes/kbv/analysis-data.js"),
  "KCH": require("price-intelligence/routes/kch/analysis-data.js"),
  "KNO": require("price-intelligence/routes/kno/analysis-data.js"),
  "KOS": require("price-intelligence/routes/kos/analysis-data.js"),
  "KTI": require("price-intelligence/routes/kti/analysis-data.js"),
  "KUA": require("price-intelligence/routes/kua/analysis-data.js"),
  "LBU": require("price-intelligence/routes/lbu/analysis-data.js"),
  "LGK": require("price-intelligence/routes/lgk/analysis-data.js"),
  "LOP": require("price-intelligence/routes/lop/analysis-data.js"),
  "LPQ": require("price-intelligence/routes/lpq/analysis-data.js"),
  "MNL": require("price-intelligence/routes/mnl/analysis-data.js"),
  "MYY": require("price-intelligence/routes/myy/analysis-data.js"),
  "PDG": require("price-intelligence/routes/pdg/analysis-data.js"),
  "PKU": require("price-intelligence/routes/pku/analysis-data.js"),
  "PLM": require("price-intelligence/routes/plm/analysis-data.js"),
  "PNK": require("price-intelligence/routes/pnk/analysis-data.js"),
  "PQC": require("price-intelligence/routes/pqc/analysis-data.js"),
  "RGN": require("price-intelligence/routes/rgn/analysis-data.js"),
  "SAI": require("price-intelligence/routes/sai/analysis-data.js"),
  "SBW": require("price-intelligence/routes/sbw/analysis-data.js"),
  "SDK": require("price-intelligence/routes/sdk/analysis-data.js"),
  "SGN": require("price-intelligence/routes/sgn/analysis-data.js"),
  "SIN": require("price-intelligence/routes/sin/analysis-data.js"),
  "SRG": require("price-intelligence/routes/srg/analysis-data.js"),
  "SUB": require("price-intelligence/routes/sub/analysis-data.js"),
  "TAG": require("price-intelligence/routes/tag/analysis-data.js"),
  "TGG": require("price-intelligence/routes/tgg/analysis-data.js"),
  "TWU": require("price-intelligence/routes/twu/analysis-data.js"),
  "UPG": require("price-intelligence/routes/upg/analysis-data.js"),
  "VTE": require("price-intelligence/routes/vte/analysis-data.js"),
  "YIA": require("price-intelligence/routes/yia/analysis-data.js")
}

},"price-intelligence/kul-pen/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.703Z",
  "sample": {
    "observation_count": 45,
    "distinct_departure_dates": 35,
    "sources": [
      "AirAsia MOVE",
      "Traveloka"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "来源页面采集时间未单独标注",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 45 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 45,
    "minimum": 115.22,
    "p10": 122.23,
    "p25": 133,
    "median": 134,
    "p75": 144,
    "p90": 144,
    "maximum": 180
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 134.8,
        "median": 134
      },
      "Tuesday": {
        "count": 5,
        "average": 134.56,
        "median": 134
      },
      "Wednesday": {
        "count": 5,
        "average": 131.95,
        "median": 133
      },
      "Thursday": {
        "count": 5,
        "average": 135.99,
        "median": 134
      },
      "Friday": {
        "count": 5,
        "average": 152.59,
        "median": 144
      },
      "Saturday": {
        "count": 5,
        "average": 137.8,
        "median": 134
      },
      "Sunday": {
        "count": 5,
        "average": 136.31,
        "median": 134
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Friday",
    "weekday_average": 137.98,
    "weekend_average": 137.05,
    "weekend_premium_percentage": -0.67,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 3,
        "average": 141.33,
        "median": 140
      },
      {
        "range": "4–7 days",
        "count": 4,
        "average": 146.5,
        "median": 144
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 142.34,
        "median": 135.94
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 133.48,
        "median": 134
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 135.6,
        "median": 134
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/aor/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.707Z",
  "sample": {
    "observation_count": 6,
    "distinct_departure_dates": 6,
    "sources": [
      "AirAsia MOVE",
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 6 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 6,
    "minimum": 98,
    "p10": 110.5,
    "p25": 123,
    "median": 123,
    "p75": 130.5,
    "p90": 138.5,
    "maximum": 144
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Tuesday": {
        "count": 2,
        "average": 110.5,
        "median": 110.5
      },
      "Wednesday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 133,
        "median": 133
      },
      "Saturday": {
        "count": 1,
        "average": 144,
        "median": 144
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 120,
    "weekend_average": 144,
    "weekend_premium_percentage": 20,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 123,
        "median": 123
      },
      {
        "range": "15–30 days",
        "count": 4,
        "average": 130.75,
        "median": 128
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 98,
        "median": 98
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bdj/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.708Z",
  "sample": {
    "observation_count": 8,
    "distinct_departure_dates": 8,
    "sources": [
      "Traveloka Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：Traveloka Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Traveloka 页面提供日期价格表；未关联到具体航司/航班的金额按 unknown 记录。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 8 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 8,
    "minimum": 320,
    "p10": 321.4,
    "p25": 325,
    "median": 329.5,
    "p75": 334.09,
    "p90": 357.65,
    "maximum": 412
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 4,
        "average": 325.5,
        "median": 324
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 2,
        "average": 373.18,
        "median": 373.18
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 2,
        "average": 329.5,
        "median": 329.5
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Thursday",
    "weekday_average": 341.39,
    "weekend_average": 329.5,
    "weekend_premium_percentage": -3.48,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 333.68,
        "median": 333.68
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 334,
        "median": 334
      },
      {
        "range": "60+ days",
        "count": 5,
        "average": 341.2,
        "median": 326
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bki/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.709Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 300,
    "p10": 300,
    "p25": 300,
    "median": 311,
    "p75": 311,
    "p90": 311,
    "maximum": 311
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 300,
        "median": 300
      },
      "Tuesday": {
        "count": 1,
        "average": 300,
        "median": 300
      },
      "Wednesday": {
        "count": 1,
        "average": 311,
        "median": 311
      },
      "Thursday": {
        "count": 1,
        "average": 311,
        "median": 311
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 311,
        "median": 311
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Saturday",
    "weekday_average": 305.5,
    "weekend_average": 311,
    "weekend_premium_percentage": 1.8,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 300,
        "median": 300
      },
      {
        "range": "15–30 days",
        "count": 4,
        "average": 308.25,
        "median": 311
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bkk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.710Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE",
      "VietJet Air"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、VietJet Air。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 97,
    "p10": 97,
    "p25": 97,
    "median": 97,
    "p75": 97,
    "p90": 223,
    "maximum": 307
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 307,
        "median": 307
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 97,
        "median": 97
      },
      "Friday": {
        "count": 1,
        "average": 97,
        "median": 97
      },
      "Saturday": {
        "count": 1,
        "average": 97,
        "median": 97
      },
      "Sunday": {
        "count": 1,
        "average": 97,
        "median": 97
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Tuesday",
    "weekday_average": 167,
    "weekend_average": 97,
    "weekend_premium_percentage": -41.92,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 202,
        "median": 202
      },
      {
        "range": "31–60 days",
        "count": 3,
        "average": 97,
        "median": 97
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bpn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.711Z",
  "sample": {
    "observation_count": 4,
    "distinct_departure_dates": 4,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 4 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 4,
    "minimum": 408,
    "p10": 408,
    "p25": 408,
    "median": 434,
    "p75": 460,
    "p90": 460,
    "maximum": 460
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 408,
        "median": 408
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 460,
        "median": 460
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 2,
        "average": 434,
        "median": 434
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Friday",
    "weekday_average": 434,
    "weekend_average": 434,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 434,
        "median": 434
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 434,
        "median": 434
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bth/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.712Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 284,
    "p10": 284,
    "p25": 284,
    "median": 315,
    "p75": 315,
    "p90": 316.2,
    "maximum": 317
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 284,
        "median": 284
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 284,
        "median": 284
      },
      "Thursday": {
        "count": 1,
        "average": 315,
        "median": 315
      },
      "Friday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 315,
        "median": 315
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Friday",
    "weekday_average": 300,
    "weekend_average": 315,
    "weekend_premium_percentage": 5,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 299.5,
        "median": 299.5
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 305.33,
        "median": 315
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/btj/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.713Z",
  "sample": {
    "observation_count": 10,
    "distinct_departure_dates": 10,
    "sources": [
      "Traveloka Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 10 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 10,
    "minimum": 163,
    "p10": 163.9,
    "p25": 189.25,
    "median": 200,
    "p75": 226.25,
    "p90": 233.2,
    "maximum": 235
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 163,
        "median": 163
      },
      "Tuesday": {
        "count": 2,
        "average": 176.5,
        "median": 176.5
      },
      "Wednesday": {
        "count": 4,
        "average": 207.25,
        "median": 202
      },
      "Thursday": {
        "count": 1,
        "average": 231,
        "median": 231
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 233,
        "median": 233
      },
      "Sunday": {
        "count": 1,
        "average": 208,
        "median": 208
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Saturday",
    "weekday_average": 197,
    "weekend_average": 220.5,
    "weekend_premium_percentage": 11.93,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 163,
        "median": 163
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 164,
        "median": 164
      },
      {
        "range": "60+ days",
        "count": 8,
        "average": 211.25,
        "median": 210
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/btu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.714Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE",
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 158,
    "p10": 176.8,
    "p25": 205,
    "median": 250,
    "p75": 250,
    "p90": 250,
    "maximum": 250
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 250,
        "median": 250
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 3,
        "average": 204.33,
        "median": 205
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Tuesday",
    "weekday_average": 250,
    "weekend_average": 204.33,
    "weekend_premium_percentage": -18.27,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 227.5,
        "median": 227.5
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 250,
        "median": 250
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 158,
        "median": 158
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/bwn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.716Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 262,
    "p10": 262,
    "p25": 262,
    "median": 262,
    "p75": 262,
    "p90": 262,
    "maximum": 262
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 262,
        "median": 262
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 2,
        "average": 262,
        "median": 262
      },
      "Friday": {
        "count": 1,
        "average": 262,
        "median": 262
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 262,
        "median": 262
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Sunday",
    "weekday_average": 262,
    "weekend_average": 262,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 1,
        "average": 262,
        "median": 262
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 262,
        "median": 262
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 262,
        "median": 262
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/ceb/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.717Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 569,
    "p10": 569,
    "p25": 569,
    "median": 569,
    "p75": 657,
    "p90": 694.8,
    "maximum": 720
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 2,
        "average": 613,
        "median": 613
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 2,
        "average": 569,
        "median": 569
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 720,
        "median": 720
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Sunday",
    "weekday_average": 591,
    "weekend_average": 720,
    "weekend_premium_percentage": 21.83,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 688.5,
        "median": 688.5
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 569,
        "median": 569
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/cgk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.720Z",
  "sample": {
    "observation_count": 30,
    "distinct_departure_dates": 30,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 30 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 30,
    "minimum": 295,
    "p10": 296,
    "p25": 296,
    "median": 296,
    "p75": 346,
    "p90": 346,
    "maximum": 487
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 316,
        "median": 296
      },
      "Tuesday": {
        "count": 4,
        "average": 295.75,
        "median": 296
      },
      "Wednesday": {
        "count": 4,
        "average": 308.5,
        "median": 296
      },
      "Thursday": {
        "count": 4,
        "average": 323.25,
        "median": 325.5
      },
      "Friday": {
        "count": 4,
        "average": 356.25,
        "median": 321
      },
      "Saturday": {
        "count": 4,
        "average": 333.5,
        "median": 346
      },
      "Sunday": {
        "count": 5,
        "average": 316,
        "median": 296
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 319.76,
    "weekend_average": 323.78,
    "weekend_premium_percentage": 1.26,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 296,
        "median": 296
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 337.57,
        "median": 296
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 312.13,
        "median": 296
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 336,
        "median": 346
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/cgy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.721Z",
  "sample": {
    "observation_count": 10,
    "distinct_departure_dates": 10,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 10 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 10,
    "minimum": 751,
    "p10": 789.7,
    "p25": 824.25,
    "median": 887,
    "p75": 892.75,
    "p90": 895.6,
    "maximum": 910
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 887,
        "median": 887
      },
      "Tuesday": {
        "count": 2,
        "average": 830.5,
        "median": 830.5
      },
      "Wednesday": {
        "count": 1,
        "average": 794,
        "median": 794
      },
      "Thursday": {
        "count": 1,
        "average": 894,
        "median": 894
      },
      "Friday": {
        "count": 1,
        "average": 887,
        "median": 887
      },
      "Saturday": {
        "count": 2,
        "average": 891.5,
        "median": 891.5
      },
      "Sunday": {
        "count": 2,
        "average": 829.5,
        "median": 829.5
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Thursday",
    "weekday_average": 853.83,
    "weekend_average": 860.5,
    "weekend_premium_percentage": 0.78,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 863.5,
        "median": 863.5
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 858.33,
        "median": 887
      },
      {
        "range": "15–30 days",
        "count": 5,
        "average": 852.6,
        "median": 889
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/cnx/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.724Z",
  "sample": {
    "observation_count": 19,
    "distinct_departure_dates": 19,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 19 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 19,
    "minimum": 428,
    "p10": 428,
    "p25": 428,
    "median": 428,
    "p75": 481.5,
    "p90": 878.8,
    "maximum": 1103
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 4,
        "average": 596.75,
        "median": 428
      },
      "Tuesday": {
        "count": 2,
        "average": 628.5,
        "median": 628.5
      },
      "Wednesday": {
        "count": 1,
        "average": 428,
        "median": 428
      },
      "Thursday": {
        "count": 4,
        "average": 482.5,
        "median": 454
      },
      "Friday": {
        "count": 2,
        "average": 481.5,
        "median": 481.5
      },
      "Saturday": {
        "count": 2,
        "average": 454,
        "median": 454
      },
      "Sunday": {
        "count": 4,
        "average": 600.75,
        "median": 448.5
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 535.77,
    "weekend_average": 551.83,
    "weekend_premium_percentage": 3,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 5,
        "average": 479.8,
        "median": 469
      },
      {
        "range": "15–30 days",
        "count": 10,
        "average": 616.5,
        "median": 480
      },
      {
        "range": "31–60 days",
        "count": 4,
        "average": 428,
        "median": 428
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/cxr/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.725Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 356,
    "p10": 356,
    "p25": 356,
    "median": 356,
    "p75": 356,
    "p90": 356,
    "maximum": 356
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 356,
        "median": 356
      },
      "Tuesday": {
        "count": 2,
        "average": 356,
        "median": 356
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 356,
        "median": 356
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 356,
        "median": 356
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Saturday",
    "weekday_average": 356,
    "weekend_average": 356,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 356,
        "median": 356
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 356,
        "median": 356
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/dad/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.727Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 325,
    "p10": 325,
    "p25": 325,
    "median": 325,
    "p75": 325,
    "p90": 349.6,
    "maximum": 366
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 325,
        "median": 325
      },
      "Wednesday": {
        "count": 1,
        "average": 325,
        "median": 325
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 2,
        "average": 345.5,
        "median": 345.5
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 325,
    "weekend_average": 345.5,
    "weekend_premium_percentage": 6.31,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 338.67,
        "median": 325
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 325,
        "median": 325
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/dli/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DLI",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.728Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "Expedia 直飞筛选结果页显示该指定日期的 MYR 单程报价；页面称价格在过去 7 天内可查。未在下单流程复核，价格与可售性可能变化。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 297,
    "p10": 297,
    "p25": 297,
    "median": 297,
    "p75": 297,
    "p90": 297,
    "maximum": 297
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 297,
        "median": 297
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 297,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 297,
        "median": 297
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/dmk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.730Z",
  "sample": {
    "observation_count": 11,
    "distinct_departure_dates": 11,
    "sources": [
      "Expedia Malaysia",
      "Traveloka Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "该路由的样本包含 Expedia Malaysia 与 Traveloka Malaysia 的公开报价。Expedia 页面称报价在过去 7 天内可查；Traveloka 价格日历按指定日期列价，但部分金额没有对应具体航班或经停信息。各样本未在下单流程逐项复核。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 11 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 11,
    "minimum": 272,
    "p10": 293,
    "p25": 294.5,
    "median": 306,
    "p75": 344.5,
    "p90": 355,
    "maximum": 365
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 306,
        "median": 306
      },
      "Tuesday": {
        "count": 2,
        "average": 345.5,
        "median": 345.5
      },
      "Wednesday": {
        "count": 2,
        "average": 329.5,
        "median": 329.5
      },
      "Thursday": {
        "count": 3,
        "average": 292.33,
        "median": 295
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 2,
        "average": 323,
        "median": 323
      },
      "Sunday": {
        "count": 1,
        "average": 296,
        "median": 296
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Tuesday",
    "weekday_average": 316.63,
    "weekend_average": 314,
    "weekend_premium_percentage": -0.83,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 2,
        "average": 313.5,
        "median": 313.5
      },
      {
        "range": "60+ days",
        "count": 9,
        "average": 316.44,
        "median": 306
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/dps/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.732Z",
  "sample": {
    "observation_count": 30,
    "distinct_departure_dates": 30,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 30 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 30,
    "minimum": 304,
    "p10": 304,
    "p25": 304,
    "median": 305,
    "p75": 370.5,
    "p90": 492.9,
    "maximum": 949
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 336,
        "median": 305
      },
      "Tuesday": {
        "count": 4,
        "average": 322.25,
        "median": 320
      },
      "Wednesday": {
        "count": 4,
        "average": 351.25,
        "median": 304.5
      },
      "Thursday": {
        "count": 4,
        "average": 378.5,
        "median": 341.5
      },
      "Friday": {
        "count": 4,
        "average": 465.75,
        "median": 305
      },
      "Saturday": {
        "count": 4,
        "average": 353.5,
        "median": 304.5
      },
      "Sunday": {
        "count": 5,
        "average": 332,
        "median": 305
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 369.1,
    "weekend_average": 341.56,
    "weekend_premium_percentage": -7.46,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 346.5,
        "median": 346.5
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 517.86,
        "median": 492
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 311.69,
        "median": 305
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 304,
        "median": 304
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/dvo/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DVO",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.733Z",
  "sample": {
    "observation_count": 2,
    "distinct_departure_dates": 2,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 2 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 2,
    "minimum": 1191,
    "p10": 1192,
    "p25": 1193.5,
    "median": 1196,
    "p75": 1198.5,
    "p90": 1200,
    "maximum": 1201
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 1191,
        "median": 1191
      },
      "Tuesday": {
        "count": 1,
        "average": 1201,
        "median": 1201
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Tuesday",
    "weekday_average": 1196,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 2,
        "average": 1196,
        "median": 1196
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/han/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.736Z",
  "sample": {
    "observation_count": 30,
    "distinct_departure_dates": 30,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 30 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 30,
    "minimum": 474,
    "p10": 474,
    "p25": 474,
    "median": 538,
    "p75": 578.75,
    "p90": 1060,
    "maximum": 1769
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 533.2,
        "median": 474
      },
      "Tuesday": {
        "count": 4,
        "average": 521.25,
        "median": 511
      },
      "Wednesday": {
        "count": 4,
        "average": 577.25,
        "median": 538
      },
      "Thursday": {
        "count": 4,
        "average": 806.5,
        "median": 571.5
      },
      "Friday": {
        "count": 4,
        "average": 839.5,
        "median": 538
      },
      "Saturday": {
        "count": 4,
        "average": 813.75,
        "median": 506
      },
      "Sunday": {
        "count": 5,
        "average": 606.6,
        "median": 538
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 649.71,
    "weekend_average": 698.67,
    "weekend_premium_percentage": 7.53,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 516.5,
        "median": 516.5
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 1173.14,
        "median": 999
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 517.38,
        "median": 506
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 481.8,
        "median": 474
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/hdy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.738Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 269,
    "p10": 269,
    "p25": 269,
    "median": 275,
    "p75": 281,
    "p90": 281,
    "maximum": 281
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 2,
        "average": 275,
        "median": 275
      },
      "Tuesday": {
        "count": 1,
        "average": 269,
        "median": 269
      },
      "Wednesday": {
        "count": 1,
        "average": 281,
        "median": 281
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 275,
        "median": 275
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 275,
    "weekend_average": 275,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 278,
        "median": 278
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 269,
        "median": 269
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 275,
        "median": 275
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/hkt/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.739Z",
  "sample": {
    "observation_count": 26,
    "distinct_departure_dates": 26,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 26 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 26,
    "minimum": 255,
    "p10": 265,
    "p25": 265,
    "median": 266,
    "p75": 305.25,
    "p90": 532,
    "maximum": 969
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 276.2,
        "median": 265
      },
      "Tuesday": {
        "count": 3,
        "average": 269.67,
        "median": 266
      },
      "Wednesday": {
        "count": 3,
        "average": 279.67,
        "median": 266
      },
      "Thursday": {
        "count": 4,
        "average": 380.5,
        "median": 297
      },
      "Friday": {
        "count": 2,
        "average": 628,
        "median": 628
      },
      "Saturday": {
        "count": 4,
        "average": 406.75,
        "median": 281.5
      },
      "Sunday": {
        "count": 5,
        "average": 307.4,
        "median": 266
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 341.59,
    "weekend_average": 351.56,
    "weekend_premium_percentage": 2.92,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 297.5,
        "median": 297.5
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 535.29,
        "median": 401
      },
      {
        "range": "15–30 days",
        "count": 13,
        "average": 274.54,
        "median": 266
      },
      {
        "range": "31–60 days",
        "count": 4,
        "average": 265,
        "median": 265
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/ilo/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.741Z",
  "sample": {
    "observation_count": 7,
    "distinct_departure_dates": 7,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 7 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 7,
    "minimum": 481,
    "p10": 576.4,
    "p25": 654.5,
    "median": 669,
    "p75": 737.5,
    "p90": 764.8,
    "maximum": 775
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 2,
        "average": 737.5,
        "median": 737.5
      },
      "Tuesday": {
        "count": 1,
        "average": 669,
        "median": 669
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 2,
        "average": 654.5,
        "median": 654.5
      },
      "Friday": {
        "count": 1,
        "average": 775,
        "median": 775
      },
      "Saturday": {
        "count": 1,
        "average": 481,
        "median": 481
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Friday",
    "weekday_average": 704.67,
    "weekend_average": 481,
    "weekend_premium_percentage": -31.74,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 4,
        "average": 634,
        "median": 669
      },
      {
        "range": "31–60 days",
        "count": 3,
        "average": 724.33,
        "median": 758
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/jhb/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.743Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 122,
    "p10": 122,
    "p25": 122,
    "median": 122,
    "p75": 123,
    "p90": 128.4,
    "maximum": 132
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 122,
        "median": 122
      },
      "Wednesday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Thursday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 132,
        "median": 132
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Sunday",
    "weekday_average": 122.25,
    "weekend_average": 132,
    "weekend_premium_percentage": 7.98,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 1,
        "average": 132,
        "median": 132
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 122.5,
        "median": 122.5
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 122,
        "median": 122
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kbr/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.744Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 122,
    "p10": 122,
    "p25": 122,
    "median": 122,
    "p75": 122,
    "p90": 122,
    "maximum": 122
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Tuesday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Wednesday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Thursday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 122,
        "median": 122
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Sunday",
    "weekday_average": 122,
    "weekend_average": 122,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 122,
        "median": 122
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 122,
        "median": 122
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kbv/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.745Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 255,
    "p10": 255,
    "p25": 255,
    "median": 255,
    "p75": 359,
    "p90": 384.8,
    "maximum": 402
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 255,
        "median": 255
      },
      "Wednesday": {
        "count": 1,
        "average": 255,
        "median": 255
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 359,
        "median": 359
      },
      "Saturday": {
        "count": 1,
        "average": 402,
        "median": 402
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 281,
    "weekend_average": 402,
    "weekend_premium_percentage": 43.06,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 4,
        "average": 317.75,
        "median": 307
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 255,
        "median": 255
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kch/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.746Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 250,
    "p10": 250,
    "p25": 250,
    "median": 250,
    "p75": 250,
    "p90": 250,
    "maximum": 250
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 250,
        "median": 250
      },
      "Wednesday": {
        "count": 2,
        "average": 250,
        "median": 250
      },
      "Thursday": {
        "count": 1,
        "average": 250,
        "median": 250
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 250,
        "median": 250
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 250,
    "weekend_average": 250,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 5,
        "average": 250,
        "median": 250
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kno/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.747Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE",
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 204,
    "p10": 209,
    "p25": 216.5,
    "median": 229,
    "p75": 229,
    "p90": 229,
    "maximum": 229
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 216.5,
        "median": 216.5
      },
      "Wednesday": {
        "count": 1,
        "average": 229,
        "median": 229
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 220.67,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 229,
        "median": 229
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 204,
        "median": 204
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kos/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.748Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 443,
    "p10": 443,
    "p25": 443,
    "median": 443,
    "p75": 443,
    "p90": 443,
    "maximum": 443
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 443,
        "median": 443
      },
      "Tuesday": {
        "count": 1,
        "average": 443,
        "median": 443
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 443,
        "median": 443
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Sunday",
    "weekday_average": 443,
    "weekend_average": 443,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 443,
        "median": 443
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 443,
        "median": 443
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kti/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KTI",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.749Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 295,
    "p10": 295,
    "p25": 295,
    "median": 295,
    "p75": 362,
    "p90": 402.2,
    "maximum": 429
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 295,
        "median": 295
      },
      "Tuesday": {
        "count": 1,
        "average": 429,
        "median": 429
      },
      "Wednesday": {
        "count": 1,
        "average": 295,
        "median": 295
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Tuesday",
    "weekday_average": 339.67,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 295,
        "median": 295
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 429,
        "median": 429
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/kua/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.750Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 88,
    "p10": 88,
    "p25": 88,
    "median": 88,
    "p75": 88,
    "p90": 88,
    "maximum": 88
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 88,
        "median": 88
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 88,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 88,
        "median": 88
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/lbu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.751Z",
  "sample": {
    "observation_count": 4,
    "distinct_departure_dates": 4,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 4 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 4,
    "minimum": 238,
    "p10": 238,
    "p25": 238,
    "median": 268,
    "p75": 298,
    "p90": 298,
    "maximum": 298
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 238,
        "median": 238
      },
      "Wednesday": {
        "count": 1,
        "average": 298,
        "median": 298
      },
      "Thursday": {
        "count": 2,
        "average": 268,
        "median": 268
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 268,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 278,
        "median": 298
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 238,
        "median": 238
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/lgk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.752Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 123,
    "p10": 123,
    "p25": 123,
    "median": 123,
    "p75": 123,
    "p90": 123,
    "maximum": 123
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 123,
        "median": 123
      },
      "Wednesday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Thursday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 123,
        "median": 123
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 123,
    "weekend_average": 123,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 4,
        "average": 123,
        "median": 123
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 123,
        "median": 123
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/lop/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.753Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 582,
    "p10": 582,
    "p25": 582,
    "median": 582,
    "p75": 623,
    "p90": 746,
    "maximum": 828
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 828,
        "median": 828
      },
      "Thursday": {
        "count": 1,
        "average": 582,
        "median": 582
      },
      "Friday": {
        "count": 1,
        "average": 623,
        "median": 623
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 2,
        "average": 582,
        "median": 582
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Wednesday",
    "weekday_average": 677.67,
    "weekend_average": 582,
    "weekend_premium_percentage": -14.12,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 595.67,
        "median": 582
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 705,
        "median": 705
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/lpq/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.756Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 554,
    "p10": 554,
    "p25": 554,
    "median": 554,
    "p75": 554,
    "p90": 554,
    "maximum": 554
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 554,
        "median": 554
      },
      "Wednesday": {
        "count": 1,
        "average": 554,
        "median": 554
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 554,
        "median": 554
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Sunday",
    "weekday_average": 554,
    "weekend_average": 554,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 2,
        "average": 554,
        "median": 554
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 554,
        "median": 554
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/mnl/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.757Z",
  "sample": {
    "observation_count": 9,
    "distinct_departure_dates": 9,
    "sources": [
      "Traveloka"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：Traveloka。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 9 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 9,
    "minimum": 478.46,
    "p10": 481.4,
    "p25": 482.13,
    "median": 496.38,
    "p75": 496.38,
    "p90": 556.38,
    "maximum": 780.56
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 2,
        "average": 640.45,
        "median": 640.45
      },
      "Tuesday": {
        "count": 1,
        "average": 496.38,
        "median": 496.38
      },
      "Wednesday": {
        "count": 1,
        "average": 485.41,
        "median": 485.41
      },
      "Thursday": {
        "count": 2,
        "average": 487.42,
        "median": 487.42
      },
      "Friday": {
        "count": 2,
        "average": 482.13,
        "median": 482.13
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 496.38,
        "median": 496.38
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Monday",
    "weekday_average": 525.22,
    "weekend_average": 496.38,
    "weekend_premium_percentage": -5.49,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 500.34,
        "median": 500.34
      },
      {
        "range": "15–30 days",
        "count": 8,
        "average": 524.73,
        "median": 490.9
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/myy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.759Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 215,
    "p10": 215,
    "p25": 215,
    "median": 215,
    "p75": 215,
    "p90": 215,
    "maximum": 215
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 215,
        "median": 215
      },
      "Wednesday": {
        "count": 2,
        "average": 215,
        "median": 215
      },
      "Thursday": {
        "count": 1,
        "average": 215,
        "median": 215
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Thursday",
    "weekday_average": 215,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 215,
        "median": 215
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 215,
        "median": 215
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/pdg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.760Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 193,
    "p10": 201.4,
    "p25": 214,
    "median": 214,
    "p75": 215,
    "p90": 303.8,
    "maximum": 363
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 193,
        "median": 193
      },
      "Tuesday": {
        "count": 1,
        "average": 214,
        "median": 214
      },
      "Wednesday": {
        "count": 1,
        "average": 214,
        "median": 214
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 363,
        "median": 363
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 215,
        "median": 215
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Friday",
    "weekday_average": 246,
    "weekend_average": 215,
    "weekend_premium_percentage": -12.6,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 204,
        "median": 204
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 263.67,
        "median": 214
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/pku/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.761Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 172,
    "p10": 172.8,
    "p25": 174,
    "median": 204,
    "p75": 204,
    "p90": 204.6,
    "maximum": 205
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 174,
        "median": 174
      },
      "Tuesday": {
        "count": 1,
        "average": 204,
        "median": 204
      },
      "Wednesday": {
        "count": 1,
        "average": 205,
        "median": 205
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 204,
        "median": 204
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 172,
        "median": 172
      }
    },
    "lowest_average_day": "Sunday",
    "highest_average_day": "Wednesday",
    "weekday_average": 196.75,
    "weekend_average": 172,
    "weekend_premium_percentage": -12.58,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 173,
        "median": 173
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 204.33,
        "median": 204
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/plm/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.762Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 201,
    "p10": 201,
    "p25": 201,
    "median": 201,
    "p75": 232,
    "p90": 256.6,
    "maximum": 273
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 201,
        "median": 201
      },
      "Wednesday": {
        "count": 1,
        "average": 201,
        "median": 201
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 273,
        "median": 273
      },
      "Saturday": {
        "count": 1,
        "average": 232,
        "median": 232
      },
      "Sunday": {
        "count": 1,
        "average": 201,
        "median": 201
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 225,
    "weekend_average": 216.5,
    "weekend_premium_percentage": -3.78,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 5,
        "average": 221.6,
        "median": 201
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/pnk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.763Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 264,
    "p10": 285.2,
    "p25": 317,
    "median": 317,
    "p75": 317,
    "p90": 317,
    "maximum": 317
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Thursday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Friday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Saturday": {
        "count": 2,
        "average": 290.5,
        "median": 290.5
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Friday",
    "weekday_average": 317,
    "weekend_average": 290.5,
    "weekend_premium_percentage": -8.36,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 5,
        "average": 306.4,
        "median": 317
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/pqc/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.765Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 221,
    "p10": 221,
    "p25": 221,
    "median": 222,
    "p75": 222,
    "p90": 243,
    "maximum": 257
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 221,
        "median": 221
      },
      "Tuesday": {
        "count": 2,
        "average": 222,
        "median": 222
      },
      "Wednesday": {
        "count": 1,
        "average": 257,
        "median": 257
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 221,
        "median": 221
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Wednesday",
    "weekday_average": 230.5,
    "weekend_average": 221,
    "weekend_premium_percentage": -4.12,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 221,
        "median": 221
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 239.5,
        "median": 239.5
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 222,
        "median": 222
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/rgn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.766Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 324,
    "p10": 324,
    "p25": 324,
    "median": 324,
    "p75": 324,
    "p90": 324,
    "maximum": 324
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 324,
        "median": 324
      }
    },
    "lowest_average_day": "Sunday",
    "highest_average_day": "Sunday",
    "weekday_average": null,
    "weekend_average": 324,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 324,
        "median": 324
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sai/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.767Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 356,
    "p10": 356,
    "p25": 356,
    "median": 356,
    "p75": 356,
    "p90": 441.2,
    "maximum": 498
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 356,
        "median": 356
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 2,
        "average": 427,
        "median": 427
      },
      "Saturday": {
        "count": 1,
        "average": 356,
        "median": 356
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 391.5,
    "weekend_average": 356,
    "weekend_premium_percentage": -9.07,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 427,
        "median": 427
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 356,
        "median": 356
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sbw/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.768Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 215,
    "p10": 215,
    "p25": 215,
    "median": 215,
    "p75": 215,
    "p90": 239.6,
    "maximum": 256
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 2,
        "average": 215,
        "median": 215
      },
      "Tuesday": {
        "count": 1,
        "average": 215,
        "median": 215
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 2,
        "average": 235.5,
        "median": 235.5
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Thursday",
    "weekday_average": 223.2,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 215,
        "median": 215
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 228.67,
        "median": 215
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sdk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.770Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 292,
    "p10": 292,
    "p25": 292,
    "median": 292,
    "p75": 292,
    "p90": 292,
    "maximum": 292
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 292,
        "median": 292
      },
      "Wednesday": {
        "count": 2,
        "average": 292,
        "median": 292
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 292,
        "median": 292
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 292,
    "weekend_average": 292,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 292,
        "median": 292
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 292,
        "median": 292
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sgn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.772Z",
  "sample": {
    "observation_count": 30,
    "distinct_departure_dates": 30,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 30 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 30,
    "minimum": 325,
    "p10": 369,
    "p25": 375.25,
    "median": 391,
    "p75": 409,
    "p90": 704.7,
    "maximum": 1229
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 430.8,
        "median": 392
      },
      "Tuesday": {
        "count": 4,
        "average": 396.5,
        "median": 391.5
      },
      "Wednesday": {
        "count": 4,
        "average": 409.75,
        "median": 391.5
      },
      "Thursday": {
        "count": 4,
        "average": 452.25,
        "median": 391
      },
      "Friday": {
        "count": 4,
        "average": 590.25,
        "median": 391
      },
      "Saturday": {
        "count": 4,
        "average": 500.75,
        "median": 380.5
      },
      "Sunday": {
        "count": 5,
        "average": 452,
        "median": 391
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Friday",
    "weekday_average": 454.71,
    "weekend_average": 473.67,
    "weekend_premium_percentage": 4.17,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 432.5,
        "median": 432.5
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 709.86,
        "median": 702
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 384.44,
        "median": 391
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 365.4,
        "median": 369
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sin/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.775Z",
  "sample": {
    "observation_count": 30,
    "distinct_departure_dates": 30,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 30 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 30,
    "minimum": 127,
    "p10": 139.6,
    "p25": 143,
    "median": 173,
    "p75": 185,
    "p90": 199.7,
    "maximum": 344
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 5,
        "average": 221.8,
        "median": 199
      },
      "Tuesday": {
        "count": 4,
        "average": 192.75,
        "median": 174.5
      },
      "Wednesday": {
        "count": 4,
        "average": 151,
        "median": 141.5
      },
      "Thursday": {
        "count": 4,
        "average": 152,
        "median": 148
      },
      "Friday": {
        "count": 4,
        "average": 160.5,
        "median": 157
      },
      "Saturday": {
        "count": 4,
        "average": 164.5,
        "median": 159
      },
      "Sunday": {
        "count": 5,
        "average": 168.6,
        "median": 175
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Monday",
    "weekday_average": 177.81,
    "weekend_average": 166.78,
    "weekend_premium_percentage": -6.2,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 2,
        "average": 168,
        "median": 168
      },
      {
        "range": "8–14 days",
        "count": 7,
        "average": 183.86,
        "median": 168
      },
      {
        "range": "15–30 days",
        "count": 16,
        "average": 167.06,
        "median": 148
      },
      {
        "range": "31–60 days",
        "count": 5,
        "average": 187.8,
        "median": 185
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/srg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.776Z",
  "sample": {
    "observation_count": 10,
    "distinct_departure_dates": 10,
    "sources": [
      "Traveloka Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：Traveloka Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Traveloka 页面提供日期价格表；未关联到具体航司/航班的金额按 unknown 记录。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 10 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 10,
    "minimum": 311,
    "p10": 320,
    "p25": 327,
    "median": 342.5,
    "p75": 360.75,
    "p90": 366.2,
    "maximum": 377
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 342,
        "median": 342
      },
      "Tuesday": {
        "count": 4,
        "average": 348.5,
        "median": 354
      },
      "Wednesday": {
        "count": 2,
        "average": 316.5,
        "median": 316.5
      },
      "Thursday": {
        "count": 1,
        "average": 342,
        "median": 342
      },
      "Friday": {
        "count": 1,
        "average": 348,
        "median": 348
      },
      "Saturday": {
        "count": 1,
        "average": 377,
        "median": 377
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Saturday",
    "weekday_average": 339.89,
    "weekend_average": 377,
    "weekend_premium_percentage": 10.92,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 311,
        "median": 311
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 322,
        "median": 322
      },
      {
        "range": "60+ days",
        "count": 8,
        "average": 350.38,
        "median": 345.5
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/sub/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.777Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE",
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 274,
    "p10": 281.2,
    "p25": 292,
    "median": 310,
    "p75": 332,
    "p90": 345.2,
    "maximum": 354
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 310,
        "median": 310
      },
      "Tuesday": {
        "count": 1,
        "average": 274,
        "median": 274
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 354,
        "median": 354
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 292,
    "weekend_average": 354,
    "weekend_premium_percentage": 21.23,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 274,
        "median": 274
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 354,
        "median": 354
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 310,
        "median": 310
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/tag/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "TAG",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.778Z",
  "sample": {
    "observation_count": 2,
    "distinct_departure_dates": 2,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 2 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 2,
    "minimum": 731,
    "p10": 751.6,
    "p25": 782.5,
    "median": 834,
    "p75": 885.5,
    "p90": 916.4,
    "maximum": 937
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 731,
        "median": 731
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 937,
        "median": 937
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Friday",
    "weekday_average": 834,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 937,
        "median": 937
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 731,
        "median": 731
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/tgg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.779Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 122,
    "p10": 122,
    "p25": 122,
    "median": 122,
    "p75": 123,
    "p90": 141,
    "maximum": 153
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Wednesday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Thursday": {
        "count": 1,
        "average": 122,
        "median": 122
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 153,
        "median": 153
      },
      "Sunday": {
        "count": 1,
        "average": 123,
        "median": 123
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 122,
    "weekend_average": 138,
    "weekend_premium_percentage": 13.11,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 1,
        "average": 123,
        "median": 123
      },
      {
        "range": "8–14 days",
        "count": 3,
        "average": 132.33,
        "median": 122
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 122,
        "median": 122
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/twu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.781Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "sources": [
      "AirAsia MOVE",
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE、Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 299,
    "p10": 301,
    "p25": 304,
    "median": 309,
    "p75": 309,
    "p90": 309,
    "maximum": 309
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 309,
        "median": 309
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 309,
        "median": 309
      },
      "Friday": {
        "count": 1,
        "average": 299,
        "median": 299
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Thursday",
    "weekday_average": 305.67,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 305.67,
        "median": 309
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/upg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.783Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 449,
    "p10": 449,
    "p25": 449,
    "median": 449,
    "p75": 503,
    "p90": 644.6,
    "maximum": 739
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 449,
        "median": 449
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 503,
        "median": 503
      },
      "Friday": {
        "count": 1,
        "average": 449,
        "median": 449
      },
      "Saturday": {
        "count": 1,
        "average": 449,
        "median": 449
      },
      "Sunday": {
        "count": 1,
        "average": 739,
        "median": 739
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Sunday",
    "weekday_average": 467,
    "weekend_average": 594,
    "weekend_premium_percentage": 27.19,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 5,
        "average": 517.8,
        "median": 449
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/vte/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.784Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 401,
    "p10": 401,
    "p25": 401,
    "median": 492,
    "p75": 493,
    "p90": 494.2,
    "maximum": 495
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 447,
        "median": 447
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 2,
        "average": 448,
        "median": 448
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 492,
        "median": 492
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 447.5,
    "weekend_average": 492,
    "weekend_premium_percentage": 9.94,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 2,
        "average": 494,
        "median": 494
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 431.33,
        "median": 401
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/routes/yia/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.786Z",
  "sample": {
    "observation_count": 5,
    "distinct_departure_dates": 5,
    "sources": [
      "AirAsia MOVE"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "one-way样本来源：AirAsia MOVE。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 5 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。"
  },
  "price_distribution_raw_quotes": {
    "count": 5,
    "minimum": 408,
    "p10": 408,
    "p25": 408,
    "median": 408,
    "p75": 408,
    "p90": 408,
    "maximum": 408
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 2,
        "average": 408,
        "median": 408
      },
      "Wednesday": {
        "count": 1,
        "average": 408,
        "median": 408
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 2,
        "average": 408,
        "median": 408
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Saturday",
    "weekday_average": 408,
    "weekend_average": 408,
    "weekend_premium_percentage": 0,
    "method": "先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 5,
        "average": 408,
        "median": 408
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。",
    "税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。",
    "日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。"
  ]
}

},"price-intelligence/round-trips/route-reports.js":function(module,exports,require){
// Generated by analyze-round-trips.js; only verified round-trip reports belong here.
module.exports = {
  "AOR": require("price-intelligence/round-trips/routes/aor/analysis-data.js"),
  "BKI": require("price-intelligence/round-trips/routes/bki/analysis-data.js"),
  "BKK": require("price-intelligence/round-trips/routes/bkk/analysis-data.js"),
  "BPN": require("price-intelligence/round-trips/routes/bpn/analysis-data.js"),
  "BTH": require("price-intelligence/round-trips/routes/bth/analysis-data.js"),
  "BTU": require("price-intelligence/round-trips/routes/btu/analysis-data.js"),
  "BWN": require("price-intelligence/round-trips/routes/bwn/analysis-data.js"),
  "CEB": require("price-intelligence/round-trips/routes/ceb/analysis-data.js"),
  "CGK": require("price-intelligence/round-trips/routes/cgk/analysis-data.js"),
  "CGY": require("price-intelligence/round-trips/routes/cgy/analysis-data.js"),
  "CNX": require("price-intelligence/round-trips/routes/cnx/analysis-data.js"),
  "CXR": require("price-intelligence/round-trips/routes/cxr/analysis-data.js"),
  "DAD": require("price-intelligence/round-trips/routes/dad/analysis-data.js"),
  "DMK": require("price-intelligence/round-trips/routes/dmk/analysis-data.js"),
  "DPS": require("price-intelligence/round-trips/routes/dps/analysis-data.js"),
  "DVO": require("price-intelligence/round-trips/routes/dvo/analysis-data.js"),
  "HAN": require("price-intelligence/round-trips/routes/han/analysis-data.js"),
  "HDY": require("price-intelligence/round-trips/routes/hdy/analysis-data.js"),
  "HKT": require("price-intelligence/round-trips/routes/hkt/analysis-data.js"),
  "ILO": require("price-intelligence/round-trips/routes/ilo/analysis-data.js"),
  "JHB": require("price-intelligence/round-trips/routes/jhb/analysis-data.js"),
  "KBR": require("price-intelligence/round-trips/routes/kbr/analysis-data.js"),
  "KBV": require("price-intelligence/round-trips/routes/kbv/analysis-data.js"),
  "KCH": require("price-intelligence/round-trips/routes/kch/analysis-data.js"),
  "KNO": require("price-intelligence/round-trips/routes/kno/analysis-data.js"),
  "KOS": require("price-intelligence/round-trips/routes/kos/analysis-data.js"),
  "KUA": require("price-intelligence/round-trips/routes/kua/analysis-data.js"),
  "LBU": require("price-intelligence/round-trips/routes/lbu/analysis-data.js"),
  "LGK": require("price-intelligence/round-trips/routes/lgk/analysis-data.js"),
  "LOP": require("price-intelligence/round-trips/routes/lop/analysis-data.js"),
  "LPQ": require("price-intelligence/round-trips/routes/lpq/analysis-data.js"),
  "MNL": require("price-intelligence/round-trips/routes/mnl/analysis-data.js"),
  "MYY": require("price-intelligence/round-trips/routes/myy/analysis-data.js"),
  "PDG": require("price-intelligence/round-trips/routes/pdg/analysis-data.js"),
  "PEN": require("price-intelligence/round-trips/routes/pen/analysis-data.js"),
  "PKU": require("price-intelligence/round-trips/routes/pku/analysis-data.js"),
  "PLM": require("price-intelligence/round-trips/routes/plm/analysis-data.js"),
  "PNK": require("price-intelligence/round-trips/routes/pnk/analysis-data.js"),
  "PQC": require("price-intelligence/round-trips/routes/pqc/analysis-data.js"),
  "RGN": require("price-intelligence/round-trips/routes/rgn/analysis-data.js"),
  "SAI": require("price-intelligence/round-trips/routes/sai/analysis-data.js"),
  "SBW": require("price-intelligence/round-trips/routes/sbw/analysis-data.js"),
  "SDK": require("price-intelligence/round-trips/routes/sdk/analysis-data.js"),
  "SGN": require("price-intelligence/round-trips/routes/sgn/analysis-data.js"),
  "SIN": require("price-intelligence/round-trips/routes/sin/analysis-data.js"),
  "SUB": require("price-intelligence/round-trips/routes/sub/analysis-data.js"),
  "TWU": require("price-intelligence/round-trips/routes/twu/analysis-data.js"),
  "UPG": require("price-intelligence/round-trips/routes/upg/analysis-data.js"),
  "VTE": require("price-intelligence/round-trips/routes/vte/analysis-data.js"),
  "YIA": require("price-intelligence/round-trips/routes/yia/analysis-data.js")
}

},"price-intelligence/round-trips/routes/aor/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.858Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 195,
    "p10": 195,
    "p25": 195,
    "median": 195,
    "p75": 195,
    "p90": 195,
    "maximum": 195
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 195,
        "median": 195
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Saturday",
    "weekday_average": null,
    "weekend_average": 195,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 195,
        "median": 195
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 195,
        "median": 195
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/bki/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.862Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 664,
    "p10": 664,
    "p25": 664,
    "median": 664,
    "p75": 664,
    "p90": 664,
    "maximum": 664
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 664,
        "median": 664
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 664,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 664,
        "median": 664
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 6,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 664,
        "median": 664
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/bkk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.863Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 565,
    "p10": 565,
    "p25": 565,
    "median": 565,
    "p75": 565,
    "p90": 565,
    "maximum": 565
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 565,
        "median": 565
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 565,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 565,
        "median": 565
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 8,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 565,
        "median": 565
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/bpn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.864Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 806,
    "p10": 806,
    "p25": 806,
    "median": 806,
    "p75": 806,
    "p90": 806,
    "maximum": 806
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 806,
        "median": 806
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 806,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 806,
        "median": 806
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 5,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 806,
        "median": 806
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/bth/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.866Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 524,
    "p10": 524,
    "p25": 524,
    "median": 524,
    "p75": 524,
    "p90": 524,
    "maximum": 524
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 524,
        "median": 524
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 524,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 524,
        "median": 524
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 524,
        "median": 524
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/btu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.868Z",
  "sample": {
    "observation_count": 6,
    "distinct_departure_dates": 6,
    "distinct_itineraries": 6,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 6 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 6,
    "minimum": 327,
    "p10": 332.5,
    "p25": 340.25,
    "median": 367,
    "p75": 409.5,
    "p90": 439,
    "maximum": 461
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 327,
        "median": 327
      },
      "Thursday": {
        "count": 2,
        "average": 382,
        "median": 382
      },
      "Friday": {
        "count": 1,
        "average": 338,
        "median": 338
      },
      "Saturday": {
        "count": 1,
        "average": 387,
        "median": 387
      },
      "Sunday": {
        "count": 1,
        "average": 461,
        "median": 461
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Sunday",
    "weekday_average": 357.25,
    "weekend_average": 424,
    "weekend_premium_percentage": 18.68,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 461,
        "median": 461
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 417,
        "median": 417
      },
      {
        "range": "60+ days",
        "count": 4,
        "average": 349.75,
        "median": 342.5
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 338,
        "median": 338
      },
      {
        "range": "4–7 晚",
        "count": 5,
        "average": 387.8,
        "median": 387
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/bwn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.869Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 449,
    "p10": 449,
    "p25": 449,
    "median": 449,
    "p75": 449,
    "p90": 449,
    "maximum": 449
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 449,
        "median": 449
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 449,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 449,
        "median": 449
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 1,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 449,
        "median": 449
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/ceb/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.870Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 781,
    "p10": 781,
    "p25": 781,
    "median": 781,
    "p75": 781,
    "p90": 781,
    "maximum": 781
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 781,
        "median": 781
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 781,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 781,
        "median": 781
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 781,
        "median": 781
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/cgk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.871Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 563,
    "p10": 563,
    "p25": 563,
    "median": 563,
    "p75": 563,
    "p90": 563,
    "maximum": 563
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 563,
        "median": 563
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 563,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 563,
        "median": 563
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 563,
        "median": 563
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/cgy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.872Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1384,
    "p10": 1384,
    "p25": 1384,
    "median": 1384,
    "p75": 1384,
    "p90": 1384,
    "maximum": 1384
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 1384,
        "median": 1384
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 1384,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 1384,
        "median": 1384
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 7,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 1384,
        "median": 1384
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/cnx/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.873Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 984,
    "p10": 984,
    "p25": 984,
    "median": 984,
    "p75": 984,
    "p90": 984,
    "maximum": 984
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 984,
        "median": 984
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 984,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 984,
        "median": 984
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 8,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 984,
        "median": 984
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/cxr/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.874Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 720,
    "p10": 720,
    "p25": 720,
    "median": 720,
    "p75": 720,
    "p90": 720,
    "maximum": 720
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 720,
        "median": 720
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Saturday",
    "weekday_average": null,
    "weekend_average": 720,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 720,
        "median": 720
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 720,
        "median": 720
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/dad/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.875Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 586,
    "p10": 586,
    "p25": 586,
    "median": 586,
    "p75": 586,
    "p90": 586,
    "maximum": 586
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 586,
        "median": 586
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 586,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 586,
        "median": 586
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 586,
        "median": 586
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/dmk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.878Z",
  "sample": {
    "observation_count": 6,
    "distinct_departure_dates": 6,
    "distinct_itineraries": 6,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 6 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 6,
    "minimum": 662,
    "p10": 692.5,
    "p25": 729.5,
    "median": 749,
    "p75": 753.5,
    "p90": 761,
    "maximum": 767
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 767,
        "median": 767
      },
      "Wednesday": {
        "count": 1,
        "average": 755,
        "median": 755
      },
      "Thursday": {
        "count": 3,
        "average": 720,
        "median": 749
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 723,
        "median": 723
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Tuesday",
    "weekday_average": 736.4,
    "weekend_average": 723,
    "weekend_premium_percentage": -1.82,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 2,
        "average": 745,
        "median": 745
      },
      {
        "range": "60+ days",
        "count": 4,
        "average": 728.75,
        "median": 749
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 5.5,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 3,
        "average": 713.33,
        "median": 723
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 3,
        "average": 755,
        "median": 749
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/dps/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.879Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 646,
    "p10": 646,
    "p25": 646,
    "median": 646,
    "p75": 646,
    "p90": 646,
    "maximum": 646
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 646,
        "median": 646
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 646,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 646,
        "median": 646
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 646,
        "median": 646
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/dvo/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "DVO",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.880Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 834,
    "p10": 834,
    "p25": 834,
    "median": 834,
    "p75": 834,
    "p90": 834,
    "maximum": 834
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 834,
        "median": 834
      }
    },
    "lowest_average_day": "Sunday",
    "highest_average_day": "Sunday",
    "weekday_average": null,
    "weekend_average": 834,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 834,
        "median": 834
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 13,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 834,
        "median": 834
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/han/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.881Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 685,
    "p10": 685,
    "p25": 685,
    "median": 685,
    "p75": 685,
    "p90": 685,
    "maximum": 685
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 685,
        "median": 685
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 685,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 685,
        "median": 685
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 5,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 685,
        "median": 685
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/hdy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.882Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 624,
    "p10": 624,
    "p25": 624,
    "median": 624,
    "p75": 624,
    "p90": 624,
    "maximum": 624
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 624,
        "median": 624
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 624,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 624,
        "median": 624
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 624,
        "median": 624
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/hkt/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.883Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 573,
    "p10": 573,
    "p25": 573,
    "median": 573,
    "p75": 573,
    "p90": 573,
    "maximum": 573
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 1,
        "average": 573,
        "median": 573
      }
    },
    "lowest_average_day": "Sunday",
    "highest_average_day": "Sunday",
    "weekday_average": null,
    "weekend_average": 573,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 573,
        "median": 573
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 573,
        "median": 573
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/ilo/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.884Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 885,
    "p10": 885,
    "p25": 885,
    "median": 885,
    "p75": 885,
    "p90": 885,
    "maximum": 885
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 885,
        "median": 885
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 885,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 885,
        "median": 885
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 885,
        "median": 885
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/jhb/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.885Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 226,
    "p10": 226,
    "p25": 226,
    "median": 226,
    "p75": 226,
    "p90": 226,
    "maximum": 226
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 226,
        "median": 226
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 226,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 226,
        "median": 226
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 226,
        "median": 226
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kbr/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.887Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 176,
    "p10": 176,
    "p25": 176,
    "median": 176,
    "p75": 176,
    "p90": 176,
    "maximum": 176
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 176,
        "median": 176
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 176,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 176,
        "median": 176
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 176,
        "median": 176
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kbv/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.888Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 434,
    "p10": 434,
    "p25": 434,
    "median": 434,
    "p75": 434,
    "p90": 434,
    "maximum": 434
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 434,
        "median": 434
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 434,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 434,
        "median": 434
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 18,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 1,
        "average": 434,
        "median": 434
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kch/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.889Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 427,
    "p10": 427,
    "p25": 427,
    "median": 427,
    "p75": 427,
    "p90": 427,
    "maximum": 427
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 427,
        "median": 427
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 427,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 427,
        "median": 427
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 427,
        "median": 427
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kno/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.890Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 2,
    "distinct_itineraries": 2,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 465,
    "p10": 485,
    "p25": 515,
    "median": 565,
    "p75": 583,
    "p90": 593.8,
    "maximum": 601
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 465,
        "median": 465
      },
      "Friday": {
        "count": 1,
        "average": 583,
        "median": 583
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Friday",
    "weekday_average": 524,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 465,
        "median": 465
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 583,
        "median": 583
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 2,
        "average": 524,
        "median": 524
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kos/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.891Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1013,
    "p10": 1013,
    "p25": 1013,
    "median": 1013,
    "p75": 1013,
    "p90": 1013,
    "maximum": 1013
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 1013,
        "median": 1013
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 1013,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 1013,
        "median": 1013
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 1013,
        "median": 1013
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/kua/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.894Z",
  "sample": {
    "observation_count": 4,
    "distinct_departure_dates": 4,
    "distinct_itineraries": 4,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 4 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 4,
    "minimum": 197,
    "p10": 209.9,
    "p25": 229.25,
    "median": 259.5,
    "p75": 284.5,
    "p90": 294.4,
    "maximum": 301
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 197,
        "median": 197
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 2,
        "average": 290,
        "median": 290
      },
      "Thursday": {
        "count": 1,
        "average": 240,
        "median": 240
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Wednesday",
    "weekday_average": 254.25,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 2,
        "average": 290,
        "median": 290
      },
      {
        "range": "60+ days",
        "count": 2,
        "average": 218.5,
        "median": 218.5
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3.5,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 2,
        "average": 238,
        "median": 238
      },
      {
        "range": "4–7 晚",
        "count": 2,
        "average": 270.5,
        "median": 270.5
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/lbu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.895Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 527,
    "p10": 527,
    "p25": 527,
    "median": 527,
    "p75": 527,
    "p90": 527,
    "maximum": 527
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 527,
        "median": 527
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 527,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 527,
        "median": 527
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 527,
        "median": 527
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/lgk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.897Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 249,
    "p10": 249,
    "p25": 249,
    "median": 249,
    "p75": 249,
    "p90": 249,
    "maximum": 249
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 249,
        "median": 249
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 249,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 249,
        "median": 249
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 249,
        "median": 249
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/lop/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.898Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1051,
    "p10": 1051,
    "p25": 1051,
    "median": 1051,
    "p75": 1051,
    "p90": 1051,
    "maximum": 1051
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 1051,
        "median": 1051
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 1051,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 1051,
        "median": 1051
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 7,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 1051,
        "median": 1051
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/lpq/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.899Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1119,
    "p10": 1119,
    "p25": 1119,
    "median": 1119,
    "p75": 1119,
    "p90": 1119,
    "maximum": 1119
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 1119,
        "median": 1119
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 1119,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 1,
        "average": 1119,
        "median": 1119
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "4–7 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 1119,
        "median": 1119
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/mnl/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.900Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1294,
    "p10": 1294,
    "p25": 1294,
    "median": 1294,
    "p75": 1294,
    "p90": 1294,
    "maximum": 1294
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 1294,
        "median": 1294
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 1294,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 1294,
        "median": 1294
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 1294,
        "median": 1294
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/myy/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.901Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 377,
    "p10": 377,
    "p25": 377,
    "median": 377,
    "p75": 377,
    "p90": 377,
    "maximum": 377
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 377,
        "median": 377
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Wednesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 377,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 377,
        "median": 377
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 377,
        "median": 377
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/pdg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.902Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 510,
    "p10": 510,
    "p25": 510,
    "median": 510,
    "p75": 510,
    "p90": 510,
    "maximum": 510
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 510,
        "median": 510
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 510,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 510,
        "median": 510
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 510,
        "median": 510
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/pen/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.903Z",
  "sample": {
    "observation_count": 7,
    "distinct_departure_dates": 6,
    "distinct_itineraries": 7,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 7 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 7,
    "minimum": 238,
    "p10": 242.2,
    "p25": 245.5,
    "median": 252,
    "p75": 253.5,
    "p90": 289.2,
    "maximum": 342
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 342,
        "median": 342
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 2,
        "average": 252.5,
        "median": 252.5
      },
      "Thursday": {
        "count": 1,
        "average": 245,
        "median": 245
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 1,
        "average": 238,
        "median": 238
      },
      "Sunday": {
        "count": 2,
        "average": 250,
        "median": 250
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Monday",
    "weekday_average": 273,
    "weekend_average": 246,
    "weekend_premium_percentage": -9.89,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 1,
        "average": 254,
        "median": 254
      },
      {
        "range": "8–14 days",
        "count": 4,
        "average": 249,
        "median": 249
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 2,
        "average": 290,
        "median": 290
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 3,
        "average": 277.33,
        "median": 252
      },
      {
        "range": "4–7 晚",
        "count": 3,
        "average": 248,
        "median": 246
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 254,
        "median": 254
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/pku/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.905Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 688,
    "p10": 688,
    "p25": 688,
    "median": 688,
    "p75": 688,
    "p90": 688,
    "maximum": 688
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 688,
        "median": 688
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 688,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 688,
        "median": 688
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 688,
        "median": 688
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/plm/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.905Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 391,
    "p10": 391,
    "p25": 391,
    "median": 391,
    "p75": 391,
    "p90": 391,
    "maximum": 391
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 391,
        "median": 391
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 391,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 391,
        "median": 391
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 7,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 391,
        "median": 391
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/pnk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.907Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 521,
    "p10": 521,
    "p25": 521,
    "median": 521,
    "p75": 521,
    "p90": 521,
    "maximum": 521
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 521,
        "median": 521
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 521,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 521,
        "median": 521
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 14,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 521,
        "median": 521
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/pqc/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.908Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 637,
    "p10": 637,
    "p25": 637,
    "median": 637,
    "p75": 637,
    "p90": 637,
    "maximum": 637
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 637,
        "median": 637
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 637,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 1,
        "average": 637,
        "median": 637
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "31–60 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 637,
        "median": 637
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/rgn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.910Z",
  "sample": {
    "observation_count": 6,
    "distinct_departure_dates": 6,
    "distinct_itineraries": 6,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 6 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 6,
    "minimum": 758,
    "p10": 808,
    "p25": 912.25,
    "median": 1164,
    "p75": 1254.5,
    "p90": 1265,
    "maximum": 1275
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 1075,
        "median": 1075
      },
      "Saturday": {
        "count": 2,
        "average": 1254,
        "median": 1254
      },
      "Sunday": {
        "count": 3,
        "average": 963.67,
        "median": 858
      }
    },
    "lowest_average_day": "Sunday",
    "highest_average_day": "Saturday",
    "weekday_average": 1075,
    "weekend_average": 1079.8,
    "weekend_premium_percentage": 0.45,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 6,
        "average": 1079,
        "median": 1164
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 7,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 4,
        "average": 991.5,
        "median": 966.5
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 1253,
        "median": 1253
      },
      {
        "range": "15 晚以上",
        "count": 1,
        "average": 1255,
        "median": 1255
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sai/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.911Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 799,
    "p10": 799,
    "p25": 799,
    "median": 799,
    "p75": 799,
    "p90": 799,
    "maximum": 799
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 799,
        "median": 799
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 799,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 799,
        "median": 799
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 799,
        "median": 799
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sbw/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.912Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 316,
    "p10": 316,
    "p25": 316,
    "median": 316,
    "p75": 316,
    "p90": 316,
    "maximum": 316
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 316,
        "median": 316
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 316,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 316,
        "median": 316
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 5,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 316,
        "median": 316
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sdk/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.912Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 418,
    "p10": 418,
    "p25": 418,
    "median": 418,
    "p75": 418,
    "p90": 418,
    "maximum": 418
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 418,
        "median": 418
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 418,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 418,
        "median": 418
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 6,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 418,
        "median": 418
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sgn/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.914Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 657,
    "p10": 657,
    "p25": 657,
    "median": 657,
    "p75": 657,
    "p90": 657,
    "maximum": 657
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 657,
        "median": 657
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 657,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 657,
        "median": 657
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 657,
        "median": 657
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sin/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.915Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 401,
    "p10": 401,
    "p25": 401,
    "median": 401,
    "p75": 401,
    "p90": 401,
    "maximum": 401
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 1,
        "average": 401,
        "median": 401
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Friday",
    "weekday_average": 401,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 1,
        "average": 401,
        "median": 401
      }
    ],
    "lowest_average_window": "60+ days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 2,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 1,
        "average": 401,
        "median": 401
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/sub/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.916Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "distinct_itineraries": 3,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 620,
    "p10": 623.2,
    "p25": 628,
    "median": 636,
    "p75": 645.5,
    "p90": 651.2,
    "maximum": 655
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 636,
        "median": 636
      },
      "Wednesday": {
        "count": 2,
        "average": 637.5,
        "median": 637.5
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 637,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 636,
        "median": 636
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 2,
        "average": 637.5,
        "median": 637.5
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 2,
        "average": 637.5,
        "median": 637.5
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 636,
        "median": 636
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/twu/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.917Z",
  "sample": {
    "observation_count": 10,
    "distinct_departure_dates": 8,
    "distinct_itineraries": 8,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 10 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 10,
    "minimum": 597,
    "p10": 655.5,
    "p25": 669,
    "median": 689.5,
    "p75": 708.25,
    "p90": 713.5,
    "maximum": 736
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 677,
        "median": 677
      },
      "Thursday": {
        "count": 2,
        "average": 721,
        "median": 721
      },
      "Friday": {
        "count": 2,
        "average": 643.5,
        "median": 643.5
      },
      "Saturday": {
        "count": 2,
        "average": 683.75,
        "median": 683.75
      },
      "Sunday": {
        "count": 1,
        "average": 709,
        "median": 709
      }
    },
    "lowest_average_day": "Friday",
    "highest_average_day": "Thursday",
    "weekday_average": 681.2,
    "weekend_average": 692.17,
    "weekend_premium_percentage": 1.61,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 3,
        "average": 646.5,
        "median": 665.5
      },
      {
        "range": "31–60 days",
        "count": 3,
        "average": 714.67,
        "median": 706
      },
      {
        "range": "60+ days",
        "count": 2,
        "average": 699.5,
        "median": 699.5
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 3,
        "average": 701.67,
        "median": 706
      },
      {
        "range": "4–7 晚",
        "count": 4,
        "average": 668.88,
        "median": 671.25
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 1,
        "average": 702,
        "median": 702
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/upg/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.918Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 1146,
    "p10": 1146,
    "p25": 1146,
    "median": 1146,
    "p75": 1146,
    "p90": 1146,
    "maximum": 1146
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 1,
        "average": 1146,
        "median": 1146
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Monday",
    "highest_average_day": "Monday",
    "weekday_average": 1146,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 1146,
        "median": 1146
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 8,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 晚",
        "count": 1,
        "average": 1146,
        "median": 1146
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/vte/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.919Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 751,
    "p10": 751,
    "p25": 751,
    "median": 751,
    "p75": 751,
    "p90": 751,
    "maximum": 751
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 751,
        "median": 751
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Tuesday",
    "weekday_average": 751,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15–30 days",
        "count": 1,
        "average": 751,
        "median": 751
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 4,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 751,
        "median": 751
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/round-trips/routes/yia/analysis-data.js":function(module,exports,require){
module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.920Z",
  "sample": {
    "observation_count": 1,
    "distinct_departure_dates": 1,
    "distinct_itineraries": 1,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 1 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 1,
    "minimum": 778,
    "p10": 778,
    "p25": 778,
    "median": 778,
    "p75": 778,
    "p90": 778,
    "maximum": 778
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Thursday": {
        "count": 1,
        "average": 778,
        "median": 778
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Thursday",
    "highest_average_day": "Thursday",
    "weekday_average": 778,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
  },
  "advance_purchase_window_by_departure_date_median": {
    "buckets": [
      {
        "range": "0–3 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "8–14 days",
        "count": 1,
        "average": 778,
        "median": 778
      },
      {
        "range": "15–30 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "lowest_average_window": "8–14 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 7,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 778,
        "median": 778
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}

},"price-intelligence/observation-index.js":function(module,exports,require){
// Generated by build-observation-index.js; static JS modules are supported by WeChat Mini Program bundling.
module.exports = {
  oneWay: {
    "AOR": require("price-intelligence/routes/aor/observations-data.js"),
    "BDJ": require("price-intelligence/routes/bdj/observations-data.js"),
    "BKI": require("price-intelligence/routes/bki/observations-data.js"),
    "BKK": require("price-intelligence/routes/bkk/observations-data.js"),
    "BPN": require("price-intelligence/routes/bpn/observations-data.js"),
    "BTH": require("price-intelligence/routes/bth/observations-data.js"),
    "BTJ": require("price-intelligence/routes/btj/observations-data.js"),
    "BTU": require("price-intelligence/routes/btu/observations-data.js"),
    "BWN": require("price-intelligence/routes/bwn/observations-data.js"),
    "CEB": require("price-intelligence/routes/ceb/observations-data.js"),
    "CGK": require("price-intelligence/routes/cgk/observations-data.js"),
    "CGY": require("price-intelligence/routes/cgy/observations-data.js"),
    "CNX": require("price-intelligence/routes/cnx/observations-data.js"),
    "CXR": require("price-intelligence/routes/cxr/observations-data.js"),
    "DAD": require("price-intelligence/routes/dad/observations-data.js"),
    "DLI": require("price-intelligence/routes/dli/observations-data.js"),
    "DMK": require("price-intelligence/routes/dmk/observations-data.js"),
    "DPS": require("price-intelligence/routes/dps/observations-data.js"),
    "DVO": require("price-intelligence/routes/dvo/observations-data.js"),
    "HAN": require("price-intelligence/routes/han/observations-data.js"),
    "HDY": require("price-intelligence/routes/hdy/observations-data.js"),
    "HKT": require("price-intelligence/routes/hkt/observations-data.js"),
    "ILO": require("price-intelligence/routes/ilo/observations-data.js"),
    "JHB": require("price-intelligence/routes/jhb/observations-data.js"),
    "KBR": require("price-intelligence/routes/kbr/observations-data.js"),
    "KBV": require("price-intelligence/routes/kbv/observations-data.js"),
    "KCH": require("price-intelligence/routes/kch/observations-data.js"),
    "KNO": require("price-intelligence/routes/kno/observations-data.js"),
    "KOS": require("price-intelligence/routes/kos/observations-data.js"),
    "KTI": require("price-intelligence/routes/kti/observations-data.js"),
    "KUA": require("price-intelligence/routes/kua/observations-data.js"),
    "LBU": require("price-intelligence/routes/lbu/observations-data.js"),
    "LGK": require("price-intelligence/routes/lgk/observations-data.js"),
    "LOP": require("price-intelligence/routes/lop/observations-data.js"),
    "LPQ": require("price-intelligence/routes/lpq/observations-data.js"),
    "MNL": require("price-intelligence/routes/mnl/observations-data.js"),
    "MYY": require("price-intelligence/routes/myy/observations-data.js"),
    "PDG": require("price-intelligence/routes/pdg/observations-data.js"),
    "PEN": require("price-intelligence/kul-pen/observations-data.js"),
    "PKU": require("price-intelligence/routes/pku/observations-data.js"),
    "PLM": require("price-intelligence/routes/plm/observations-data.js"),
    "PNK": require("price-intelligence/routes/pnk/observations-data.js"),
    "PQC": require("price-intelligence/routes/pqc/observations-data.js"),
    "RGN": require("price-intelligence/routes/rgn/observations-data.js"),
    "SAI": require("price-intelligence/routes/sai/observations-data.js"),
    "SBW": require("price-intelligence/routes/sbw/observations-data.js"),
    "SDK": require("price-intelligence/routes/sdk/observations-data.js"),
    "SGN": require("price-intelligence/routes/sgn/observations-data.js"),
    "SIN": require("price-intelligence/routes/sin/observations-data.js"),
    "SRG": require("price-intelligence/routes/srg/observations-data.js"),
    "SUB": require("price-intelligence/routes/sub/observations-data.js"),
    "TAG": require("price-intelligence/routes/tag/observations-data.js"),
    "TGG": require("price-intelligence/routes/tgg/observations-data.js"),
    "TWU": require("price-intelligence/routes/twu/observations-data.js"),
    "UPG": require("price-intelligence/routes/upg/observations-data.js"),
    "VTE": require("price-intelligence/routes/vte/observations-data.js"),
    "YIA": require("price-intelligence/routes/yia/observations-data.js")
  },
  roundTrip: {
    "AOR": require("price-intelligence/round-trips/routes/aor/observations-data.js"),
    "BKI": require("price-intelligence/round-trips/routes/bki/observations-data.js"),
    "BKK": require("price-intelligence/round-trips/routes/bkk/observations-data.js"),
    "BPN": require("price-intelligence/round-trips/routes/bpn/observations-data.js"),
    "BTH": require("price-intelligence/round-trips/routes/bth/observations-data.js"),
    "BTU": require("price-intelligence/round-trips/routes/btu/observations-data.js"),
    "BWN": require("price-intelligence/round-trips/routes/bwn/observations-data.js"),
    "CEB": require("price-intelligence/round-trips/routes/ceb/observations-data.js"),
    "CGK": require("price-intelligence/round-trips/routes/cgk/observations-data.js"),
    "CGY": require("price-intelligence/round-trips/routes/cgy/observations-data.js"),
    "CNX": require("price-intelligence/round-trips/routes/cnx/observations-data.js"),
    "CXR": require("price-intelligence/round-trips/routes/cxr/observations-data.js"),
    "DAD": require("price-intelligence/round-trips/routes/dad/observations-data.js"),
    "DMK": require("price-intelligence/round-trips/routes/dmk/observations-data.js"),
    "DPS": require("price-intelligence/round-trips/routes/dps/observations-data.js"),
    "DVO": require("price-intelligence/round-trips/routes/dvo/observations-data.js"),
    "HAN": require("price-intelligence/round-trips/routes/han/observations-data.js"),
    "HDY": require("price-intelligence/round-trips/routes/hdy/observations-data.js"),
    "HKT": require("price-intelligence/round-trips/routes/hkt/observations-data.js"),
    "ILO": require("price-intelligence/round-trips/routes/ilo/observations-data.js"),
    "JHB": require("price-intelligence/round-trips/routes/jhb/observations-data.js"),
    "KBR": require("price-intelligence/round-trips/routes/kbr/observations-data.js"),
    "KBV": require("price-intelligence/round-trips/routes/kbv/observations-data.js"),
    "KCH": require("price-intelligence/round-trips/routes/kch/observations-data.js"),
    "KNO": require("price-intelligence/round-trips/routes/kno/observations-data.js"),
    "KOS": require("price-intelligence/round-trips/routes/kos/observations-data.js"),
    "KUA": require("price-intelligence/round-trips/routes/kua/observations-data.js"),
    "LBU": require("price-intelligence/round-trips/routes/lbu/observations-data.js"),
    "LGK": require("price-intelligence/round-trips/routes/lgk/observations-data.js"),
    "LOP": require("price-intelligence/round-trips/routes/lop/observations-data.js"),
    "LPQ": require("price-intelligence/round-trips/routes/lpq/observations-data.js"),
    "MNL": require("price-intelligence/round-trips/routes/mnl/observations-data.js"),
    "MYY": require("price-intelligence/round-trips/routes/myy/observations-data.js"),
    "PDG": require("price-intelligence/round-trips/routes/pdg/observations-data.js"),
    "PEN": require("price-intelligence/round-trips/routes/pen/observations-data.js"),
    "PKU": require("price-intelligence/round-trips/routes/pku/observations-data.js"),
    "PLM": require("price-intelligence/round-trips/routes/plm/observations-data.js"),
    "PNK": require("price-intelligence/round-trips/routes/pnk/observations-data.js"),
    "PQC": require("price-intelligence/round-trips/routes/pqc/observations-data.js"),
    "RGN": require("price-intelligence/round-trips/routes/rgn/observations-data.js"),
    "SAI": require("price-intelligence/round-trips/routes/sai/observations-data.js"),
    "SBW": require("price-intelligence/round-trips/routes/sbw/observations-data.js"),
    "SDK": require("price-intelligence/round-trips/routes/sdk/observations-data.js"),
    "SGN": require("price-intelligence/round-trips/routes/sgn/observations-data.js"),
    "SIN": require("price-intelligence/round-trips/routes/sin/observations-data.js"),
    "SUB": require("price-intelligence/round-trips/routes/sub/observations-data.js"),
    "TWU": require("price-intelligence/round-trips/routes/twu/observations-data.js"),
    "UPG": require("price-intelligence/round-trips/routes/upg/observations-data.js"),
    "VTE": require("price-intelligence/round-trips/routes/vte/observations-data.js"),
    "YIA": require("price-intelligence/round-trips/routes/yia/observations-data.js")
  }
}

},"price-intelligence/routes/aor/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-alor-setar-aor/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-alor-setar-aor/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-alor-setar-aor/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-alor-setar-aor/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-alor-setar-aor/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "one_way",
    "flight_date": "2027-02-23",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 98,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/aor/kuala-lumpur-to-alor-setar?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 120,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/bdj/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 333,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2026-12-01",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 334,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2027-01-12",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 322,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 78,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2027-02-16",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 326,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 113,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2027-03-02",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 320,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 127,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2027-04-10",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 326,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 166,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2027-06-24",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 412,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 241,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BDJ",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia Berhad (Malaysia)",
    "price": 334.36,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banjarmasin.KUL.BDJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Traveloka 页面列出 AirAsia Berhad (Malaysia) 于指定日期的 KUL-BDJ 航班及该票价；价格与可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页近期抓取内容列出该日期的承运航司和金额，页面未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/bki/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 300,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-kota-kinabalu-bki/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 300,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-kota-kinabalu-bki/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 311,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-kota-kinabalu-bki/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 311,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-kota-kinabalu-bki/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 311,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-kota-kinabalu-bki/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/bkk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Thai Vietjet",
    "price": 307,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bangkok-bkk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "VietJet Air",
    "price": 97,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "VietJet Air",
    "source_url": "https://www.vietjetair.com/en/flight-tickets/flights-from-kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "VietJet 官网标注票价于近 24 小时内采集；AirAsia MOVE 页面于采集日可访问"
  },
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "VietJet Air",
    "price": 97,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "VietJet Air",
    "source_url": "https://www.vietjetair.com/en/flight-tickets/flights-from-kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "VietJet 官网标注票价于近 24 小时内采集；AirAsia MOVE 页面于采集日可访问"
  },
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "VietJet Air",
    "price": 97,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "VietJet Air",
    "source_url": "https://www.vietjetair.com/en/flight-tickets/flights-from-kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "VietJet 官网标注票价于近 24 小时内采集；AirAsia MOVE 页面于采集日可访问"
  },
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "VietJet Air",
    "price": 97,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "VietJet Air",
    "source_url": "https://www.vietjetair.com/en/flight-tickets/flights-from-kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "VietJet 官网标注票价于近 24 小时内采集；AirAsia MOVE 页面于采集日可访问"
  }
]

},"price-intelligence/routes/bpn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 460,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-balikpapan-bpn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-balikpapan-bpn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 460,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-balikpapan-bpn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-balikpapan-bpn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/bth/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 315,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-batam-bth/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 284,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-batam-bth/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 284,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-batam-bth/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 317,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-batam-bth/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 315,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-batam-bth/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/btj/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 163,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2026-12-01",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 164,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-01-20",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 192,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 86,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-02-16",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 189,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 113,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-03-03",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 190,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 128,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-04-04",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 208,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 160,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-05-12",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 212,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 198,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-06-10",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 231,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 227,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-07-31",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 233,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 278,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  },
  {
    "origin": "KUL",
    "destination": "BTJ",
    "trip_type": "one_way",
    "flight_date": "2027-09-29",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 235,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Banda-Aceh.KUL.BTJ",
    "collected_at": "2026-10-26",
    "days_before_departure": 338,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Traveloka 公开航线页显示了所列日期和 MYR 价格，并标示该航线有直飞航班；日历价格未逐条关联到具体航空公司或班次，承运人记为 unknown。未在下单步骤核验可售性。"
  }
]

},"price-intelligence/routes/btu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-bintulu-btu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 205,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-bintulu-btu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-bintulu-btu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-bintulu-btu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "one_way",
    "flight_date": "2027-02-20",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 158,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 117,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/bwn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 262,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-brunei-bwn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 262,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-brunei-bwn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 262,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-brunei-bwn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 262,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-brunei-bwn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 262,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-brunei-bwn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/ceb/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 720,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-cebu-ceb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 657,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-cebu-ceb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 569,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-cebu-ceb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 569,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-cebu-ceb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 569,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-cebu-ceb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/cgk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 487,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 295,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  },
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 346,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-jakarta-cgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约 5 天前抓取"
  }
]

},"price-intelligence/routes/cgy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 840,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 887,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 794,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 894,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 887,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 889,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 819,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 910,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 894,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 751,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-cagayan-de-oro-cgy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/cnx/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 594,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 480,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 469,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 483,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 480,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 480,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1078,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1103,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 829,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  },
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 428,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/hk/from-kuala-lumpur-kul-to-chiang-mai-cnx/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 搜索快照标注约一个月前抓取；票价新鲜度较低"
  }
]

},"price-intelligence/routes/cxr/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-nha-trang-cxr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-nha-trang-cxr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-nha-trang-cxr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-nha-trang-cxr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-nha-trang-cxr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/dad/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 325,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-da-nang-dad/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 325,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-da-nang-dad/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 366,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-da-nang-dad/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 325,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-da-nang-dad/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 325,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-da-nang-dad/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/dli/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DLI",
    "trip_type": "one_way",
    "flight_date": "2027-03-03",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 297,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dli/kuala-lumpur-to-da-lat",
    "collected_at": "2026-10-26",
    "days_before_departure": 128,
    "fare_type": "public date-specific one-way fare listing",
    "snapshot_note": "公开平台列明的指定日期单程报价；价格和可售性可能变化。",
    "source_freshness_note": "Expedia 直飞筛选结果页显示该指定日期的 MYR 单程报价；页面称价格在过去 7 天内可查。未在下单流程复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/dmk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-07-03",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 293,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 250,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 272,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2026-12-22",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 355,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 57,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-01-26",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 336,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 92,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-02-25",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 310,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 122,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-03-01",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 306,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 126,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-04-17",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 353,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 173,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-05-05",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 294,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 191,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-06-06",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 296,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 223,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-08-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 295,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 290,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "one_way",
    "flight_date": "2027-09-08",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 365,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/zh-my/flight/route/Kuala-Lumpur-Bangkok.KUL.DMK",
    "collected_at": "2026-10-26",
    "days_before_departure": 317,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "Traveloka 价格日历按该具体出发日期显示的单程金额；不代表仍可订。",
    "source_freshness_note": "Traveloka 公开航线页的价格日历列出该指定日期金额，页面另列有 KUL-DMK 直飞航线信息；日历金额没有逐条关联到具体航班或经停信息，航司与经停情况记为 unknown。网页快照未在下单流程复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/dps/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 388,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 335,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 492,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 527,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 949,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 501,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 442,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 379,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 345,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 379,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 305,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 304,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-bali-dps/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  }
]

},"price-intelligence/routes/dvo/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DVO",
    "trip_type": "one_way",
    "flight_date": "2026-12-14",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 1191,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/km/kh/from-kuala-lumpur-kul-to-davao-dvo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 49,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "DVO",
    "trip_type": "one_way",
    "flight_date": "2026-12-15",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 1201,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/km/kh/from-kuala-lumpur-kul-to-davao-dvo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 50,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/han/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 548,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 485,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 548,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 759,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1609,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1769,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1769,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 999,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 759,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 589,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 669,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 538,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 513,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 474,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-hanoi-han/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  }
]

},"price-intelligence/routes/hdy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 275,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-hat-yai-hdy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 281,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-hat-yai-hdy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 269,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-hat-yai-hdy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 269,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-hat-yai-hdy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 281,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-hat-yai-hdy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/hkt/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 340,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 255,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 277,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 308,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 663,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 969,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 799,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 401,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 330,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 297,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 287,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 297,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 297,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 266,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 265,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-phuket-hkt/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  }
]

},"price-intelligence/routes/ilo/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 669,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 481,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 717,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 669,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 640,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 775,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 758,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-iloilo-ilo/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/jhb/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 132,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-johor-bahru-jhb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-johor-bahru-jhb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-johor-bahru-jhb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-johor-bahru-jhb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-johor-bahru-jhb/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/kbr/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kota-bharu-kbr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kota-bharu-kbr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kota-bharu-kbr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kota-bharu-kbr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kota-bharu-kbr/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/kbv/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 255,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-krabi-kbv/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 255,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-krabi-kbv/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 359,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-krabi-kbv/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 402,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-krabi-kbv/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 255,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-krabi-kbv/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/kch/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-kuching-kch/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-kuching-kch/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-kuching-kch/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-kuching-kch/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 250,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-kuching-kch/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/kno/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 229,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-medan-kno/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 229,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-medan-kno/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "one_way",
    "flight_date": "2027-03-02",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 204,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kno/kuala-lumpur-to-medan",
    "collected_at": "2026-10-26",
    "days_before_departure": 127,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/kos/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 443,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/sihanouk-international-airport-sihanoukville/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 443,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/sihanouk-international-airport-sihanoukville/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 443,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/sihanouk-international-airport-sihanoukville/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/kti/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KTI",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 295,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phnom-penh-pnh/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KTI",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 295,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phnom-penh-pnh/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "KTI",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 429,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phnom-penh-pnh/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/kua/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "one_way",
    "flight_date": "2027-02-18",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 88,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kua/kuala-lumpur-to-kuantan",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/lbu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 298,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/labuan-federal-territory-malaysia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 298,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/labuan-federal-territory-malaysia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 238,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/labuan-federal-territory-malaysia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 238,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/labuan-federal-territory-malaysia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/lgk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-langkawi-lgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-langkawi-lgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-langkawi-lgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-langkawi-lgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-langkawi-lgk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/lop/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 582,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-lombok-lop/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 623,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-lombok-lop/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 582,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-lombok-lop/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 828,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-lombok-lop/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 582,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-lombok-lop/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/lpq/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 554,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/cn/from-kuala-lumpur-kul-to-luang-prabang-lpq/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 554,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/cn/from-kuala-lumpur-kul-to-luang-prabang-lpq/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "one_way",
    "flight_date": "2026-12-01",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 554,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/zh/cn/from-kuala-lumpur-kul-to-luang-prabang-lpq/",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/mnl/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 500.34,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 496.38,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 485.41,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 496.38,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Philippine Airlines",
    "price": 482.13,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 496.38,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Philippine Airlines",
    "price": 478.46,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Philippine Airlines",
    "price": 482.13,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  },
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 780.56,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Manila.KUL.MNL",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "Traveloka 搜索结果在采集日可访问；路线详情页索引约 3 周前，报价新鲜度需留意"
  }
]

},"price-intelligence/routes/myy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-miri-myy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-miri-myy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-miri-myy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-miri-myy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-miri-myy/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/pdg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-padang-pdg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 193,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-padang-pdg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 214,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-padang-pdg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 214,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-padang-pdg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 363,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-padang-pdg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/kul-pen/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-10-27",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 140,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 1,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-10-28",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 140,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 2,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-10-29",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 3,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-10-30",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 154,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 4,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-10-31",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 5,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 180,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 144,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 133,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 134,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "price_basis": "route-calendar displayed fare",
    "source_observation_type": "public route calendar"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia Berhad (Malaysia)",
    "price": 115.22,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia Berhad (Malaysia)",
    "price": 118.08,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Firefly",
    "price": 119.42,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Firefly",
    "price": 119.63,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 126.12,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 126.63,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Batik Air Malaysia",
    "price": 137.93,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Batik Air Malaysia",
    "price": 137.93,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia Berhad (Malaysia)",
    "price": 118.08,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "Malaysia Airlines",
    "price": 127.88,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "price_basis": "route-page displayed one-way fare",
    "source_observation_type": "public route fare listing"
  }
]

},"price-intelligence/routes/pku/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 172,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-pekanbaru-pku/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 174,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-pekanbaru-pku/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 204,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-pekanbaru-pku/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 205,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-pekanbaru-pku/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 204,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-pekanbaru-pku/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/plm/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 201,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-palembang-plm/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 201,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-palembang-plm/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 273,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-palembang-plm/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 232,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-palembang-plm/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 201,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-palembang-plm/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/pnk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 264,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/supadio-international-airport-pontianak/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 317,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/supadio-international-airport-pontianak/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 317,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/supadio-international-airport-pontianak/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 317,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/supadio-international-airport-pontianak/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 317,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/supadio-international-airport-pontianak/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/pqc/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 221,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phu-quoc-pqc/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 221,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phu-quoc-pqc/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 222,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phu-quoc-pqc/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 257,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phu-quoc-pqc/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 222,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-phu-quoc-pqc/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/rgn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "one_way",
    "flight_date": "2027-02-21",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 324,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 118,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/sai/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-siem-reap-sai/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 498,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-siem-reap-sai/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-siem-reap-sai/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-siem-reap-sai/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 356,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-siem-reap-sai/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/sbw/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-sibu-sbw/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-sibu-sbw/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-sibu-sbw/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 215,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-sibu-sbw/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 256,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-sibu-sbw/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/sdk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 292,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-sandakan-sdk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 292,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-sandakan-sdk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 292,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-sandakan-sdk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 292,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-sandakan-sdk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 292,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-sandakan-sdk/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/sgn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 400,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 465,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 412,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 465,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 702,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 1229,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 873,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 729,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 559,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 392,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 369,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 370,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 369,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 392,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 370,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 369,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 392,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 325,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 350,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 369,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 392,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-ho-chi-minh-city-sgn/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  }
]

},"price-intelligence/routes/sin/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 130,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 206,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 7,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 150,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 136,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 171,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 175,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 168,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-09",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 344,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 279,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 140,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 153,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 141,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 175,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 20,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-16",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 175,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-19",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 127,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-20",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 25,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 143,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-22",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 199,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 199,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-25",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-27",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 199,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-29",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 34,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  },
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "one_way",
    "flight_date": "2026-11-30",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "AirAsia",
    "price": 185,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/en/gb/from-kuala-lumpur-kul-to-singapore-sin/",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "网页快照采集日期；票价可能变化，具体税费及可订性以来源页面为准",
    "source_freshness_note": "AirAsia MOVE 页面在采集日可访问（2026-10-26）"
  }
]

},"price-intelligence/routes/srg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2026-11-18",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 311,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 23,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2026-12-02",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 322,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 37,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-01-12",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 321,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 78,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-02-02",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 343,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 99,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-03-29",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 342,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 154,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-04-08",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 342,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 164,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-05-01",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 377,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 187,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-06-08",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 365,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 225,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-08-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 365,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 295,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SRG",
    "trip_type": "one_way",
    "flight_date": "2027-09-10",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 348,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Traveloka Malaysia",
    "source_url": "https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Semarang.KUL.SRG",
    "collected_at": "2026-10-26",
    "days_before_departure": 319,
    "fare_type": "public date-specific fare-calendar listing",
    "snapshot_note": "来源页面按具体出发日期显示的单程价格；未作为可售性保证。",
    "source_freshness_note": "Traveloka 公开航线页按具体日期列出价格，页面另列有该航线航班时刻；每个日历价格未能和承运航司/直飞中转逐项对应，因此航司记为 unknown。页面快照未在下单步骤复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/sub/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 274,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/juanda-international-airport-surabaya/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "one_way",
    "flight_date": "2026-11-28",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 354,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/juanda-international-airport-surabaya/",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "one_way",
    "flight_date": "2027-08-02",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 310,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sub/kuala-lumpur-to-surabaya?flightType=roundtrip",
    "collected_at": "2026-10-26",
    "days_before_departure": 280,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/tag/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "TAG",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 937,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-tagbilaran-tag/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TAG",
    "trip_type": "one_way",
    "flight_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 731,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-tagbilaran-tag/",
    "collected_at": "2026-10-26",
    "days_before_departure": 28,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/tgg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "flight_date": "2026-11-01",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 123,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kuala-terengganu-tgg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kuala-terengganu-tgg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "flight_date": "2026-11-04",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kuala-terengganu-tgg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 153,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kuala-terengganu-tgg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TGG",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 122,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-kuala-terengganu-tgg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/twu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 309,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-tawau-twu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "one_way",
    "flight_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 309,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/ms/my/from-kuala-lumpur-kul-to-tawau-twu/",
    "collected_at": "2026-10-26",
    "days_before_departure": 22,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "one_way",
    "flight_date": "2026-11-13",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 299,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "Expedia Malaysia",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "Expedia 页面显示的指定日期单程报价快照；票价和可订性可能变化。",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/routes/upg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 449,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-makassar-upg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 503,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-makassar-upg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "flight_date": "2026-11-06",
    "weekday": "Friday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 449,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-makassar-upg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "flight_date": "2026-11-07",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 449,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-makassar-upg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 12,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  },
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "one_way",
    "flight_date": "2026-11-08",
    "weekday": "Sunday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 739,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/tr/tr/from-kuala-lumpur-kul-to-makassar-upg/",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "公开航线页/搜索索引列出的单程标价快照；票价和可订性可能变化。",
    "source_freshness_note": "公开航线页/搜索索引中的标价快照；页面抓取时间可能早于本次提取日，未对每个行程实时完成下单核验。转机情况未能对应到每个日历价格时，航司标为 unknown。"
  }
]

},"price-intelligence/routes/vte/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "flight_date": "2026-11-03",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 493,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-vientiane-vte/",
    "collected_at": "2026-10-26",
    "days_before_departure": 8,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "flight_date": "2026-11-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 495,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-vientiane-vte/",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 401,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-vientiane-vte/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "flight_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 401,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-vientiane-vte/",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 492,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-vientiane-vte/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/routes/yia/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "flight_date": "2026-11-10",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-yogyakarta-yia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "flight_date": "2026-11-11",
    "weekday": "Wednesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-yogyakarta-yia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "flight_date": "2026-11-14",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-yogyakarta-yia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "flight_date": "2026-11-21",
    "weekday": "Saturday",
    "is_weekend": true,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-yogyakarta-yia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  },
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "one_way",
    "flight_date": "2026-11-24",
    "weekday": "Tuesday",
    "is_weekend": false,
    "is_holiday": null,
    "airline": "unknown",
    "price": 408,
    "currency": "MYR",
    "baggage": "unknown",
    "source": "AirAsia MOVE",
    "source_url": "https://www.airasia.com/flights/from-kuala-lumpur-kul-to-yogyakarta-yia/",
    "collected_at": "2026-10-26",
    "days_before_departure": 29,
    "fare_type": "public displayed one-way fare",
    "snapshot_note": "搜索索引/公开航线页面列出的单程标价快照；价格和可订性可能变化，不代表历史成交价。",
    "source_freshness_note": "来源页面搜索快照更新时间未明确；本项目于2026-10-26摘录页面列出的航班日期与标价，未对每个票价进行实时下单核验。"
  }
]

},"price-intelligence/round-trips/routes/aor/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "AOR",
    "trip_type": "round_trip",
    "flight_date": "2027-07-10",
    "return_date": "2027-07-12",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "Malaysia Airlines",
    "price": 195,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/aor/kuala-lumpur-to-alor-setar?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 257,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/bki/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BKI",
    "trip_type": "round_trip",
    "flight_date": "2026-12-11",
    "return_date": "2026-12-17",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 664,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/bki/kuala-lumpur-to-kota-kinabalu",
    "collected_at": "2026-10-26",
    "days_before_departure": 46,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/bkk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BKK",
    "trip_type": "round_trip",
    "flight_date": "2027-02-18",
    "return_date": "2027-02-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 565,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/bkk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/bpn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BPN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-13",
    "return_date": "2026-11-18",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 806,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/bpn/kuala-lumpur-to-balikpapan",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/bth/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BTH",
    "trip_type": "round_trip",
    "flight_date": "2026-11-12",
    "return_date": "2026-11-15",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 524,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/bth/kuala-lumpur-to-batam-batu-besar",
    "collected_at": "2026-10-26",
    "days_before_departure": 17,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/btu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-08",
    "return_date": "2026-11-12",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Malaysia Airlines",
    "price": 461,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2027-04-28",
    "return_date": "2027-05-05",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 327,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 184,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2027-07-16",
    "return_date": "2027-07-18",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 338,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 263,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2027-02-18",
    "return_date": "2027-02-24",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 347,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2027-03-20",
    "return_date": "2027-03-24",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 387,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 145,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "BTU",
    "trip_type": "round_trip",
    "flight_date": "2026-12-03",
    "return_date": "2026-12-07",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 417,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/btu/kuala-lumpur-to-bintulu",
    "collected_at": "2026-10-26",
    "days_before_departure": 38,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/bwn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "BWN",
    "trip_type": "round_trip",
    "flight_date": "2027-01-15",
    "return_date": "2027-01-16",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 449,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/bwn/kuala-lumpur-to-bandar-seri-begawan",
    "collected_at": "2026-10-26",
    "days_before_departure": 81,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/ceb/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CEB",
    "trip_type": "round_trip",
    "flight_date": "2027-03-18",
    "return_date": "2027-03-21",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 781,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/ceb/kuala-lumpur-to-cebu",
    "collected_at": "2026-10-26",
    "days_before_departure": 143,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/cgk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CGK",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-12",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Indonesia AirAsia",
    "price": 563,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/cgk/kuala-lumpur-to-jakarta",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/cgy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CGY",
    "trip_type": "round_trip",
    "flight_date": "2026-11-16",
    "return_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 1384,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/cgy/kuala-lumpur-to-cagayan-de-oro",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/cnx/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CNX",
    "trip_type": "round_trip",
    "flight_date": "2026-11-11",
    "return_date": "2026-11-19",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 984,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/cnx/kuala-lumpur-to-chiang-mai",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/cxr/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "CXR",
    "trip_type": "round_trip",
    "flight_date": "2026-11-14",
    "return_date": "2026-11-16",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 720,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/cxr/kuala-lumpur-to-cam-ranh-intl-airport",
    "collected_at": "2026-10-26",
    "days_before_departure": 19,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/dad/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DAD",
    "trip_type": "round_trip",
    "flight_date": "2026-11-25",
    "return_date": "2026-11-28",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 586,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dad/kuala-lumpur-to-da-nang",
    "collected_at": "2026-10-26",
    "days_before_departure": 30,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/dmk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2027-02-18",
    "return_date": "2027-02-26",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 749,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2027-07-21",
    "return_date": "2027-07-24",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 755,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 268,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2026-12-01",
    "return_date": "2026-12-09",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 767,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2027-04-29",
    "return_date": "2027-05-02",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 662,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 185,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2026-11-28",
    "return_date": "2026-12-01",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 723,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "DMK",
    "trip_type": "round_trip",
    "flight_date": "2027-02-25",
    "return_date": "2027-03-05",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 749,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dmk/kuala-lumpur-to-bangkok",
    "collected_at": "2026-10-26",
    "days_before_departure": 122,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/dps/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DPS",
    "trip_type": "round_trip",
    "flight_date": "2026-11-19",
    "return_date": "2026-11-22",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 646,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dps/kuala-lumpur-to-denpasar",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/dvo/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "DVO",
    "trip_type": "round_trip",
    "flight_date": "2027-02-21",
    "return_date": "2027-03-06",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Scoot",
    "price": 834,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/dvo/kuala-lumpur-to-davao",
    "collected_at": "2026-10-26",
    "days_before_departure": 118,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/han/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HAN",
    "trip_type": "round_trip",
    "flight_date": "2027-03-29",
    "return_date": "2027-04-03",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 685,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/han/kuala-lumpur-to-hanoi",
    "collected_at": "2026-10-26",
    "days_before_departure": 154,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/hdy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HDY",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-13",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Thai AirAsia",
    "price": 624,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/hdy/kuala-lumpur-to-hat-yai",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/hkt/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "HKT",
    "trip_type": "round_trip",
    "flight_date": "2026-11-22",
    "return_date": "2026-11-24",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Malindo Air",
    "price": 573,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/hkt/kuala-lumpur-to-phuket",
    "collected_at": "2026-10-26",
    "days_before_departure": 27,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/ilo/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "ILO",
    "trip_type": "round_trip",
    "flight_date": "2026-11-11",
    "return_date": "2026-11-15",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Scoot",
    "price": 885,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/ilo/kuala-lumpur-to-iloilo",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/jhb/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "JHB",
    "trip_type": "round_trip",
    "flight_date": "2026-11-27",
    "return_date": "2026-11-30",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Firefly",
    "price": 226,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/jhb/kuala-lumpur-to-johor-bahru",
    "collected_at": "2026-10-26",
    "days_before_departure": 32,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/kbr/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KBR",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-14",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Firefly",
    "price": 176,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kbr/kuala-lumpur-to-kota-bharu",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/kbv/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KBV",
    "trip_type": "round_trip",
    "flight_date": "2027-02-25",
    "return_date": "2027-03-15",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 434,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kbv/kuala-lumpur-to-krabi",
    "collected_at": "2026-10-26",
    "days_before_departure": 122,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/kch/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KCH",
    "trip_type": "round_trip",
    "flight_date": "2026-11-13",
    "return_date": "2026-11-15",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 427,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kch/kuala-lumpur-to-kuching",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/kno/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "round_trip",
    "flight_date": "2026-11-19",
    "return_date": "2026-11-21",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Indonesia AirAsia",
    "price": 465,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kno/kuala-lumpur-to-medan",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "round_trip",
    "flight_date": "2027-01-22",
    "return_date": "2027-01-24",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Scoot",
    "price": 565,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kno/kuala-lumpur-to-medan",
    "collected_at": "2026-10-26",
    "days_before_departure": 88,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "KNO",
    "trip_type": "round_trip",
    "flight_date": "2027-01-22",
    "return_date": "2027-01-24",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Malindo Air",
    "price": 601,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kno/kuala-lumpur-to-medan",
    "collected_at": "2026-10-26",
    "days_before_departure": 88,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/kos/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KOS",
    "trip_type": "round_trip",
    "flight_date": "2026-12-15",
    "return_date": "2026-12-19",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia Cambodia",
    "price": 1013,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kos/kuala-lumpur-to-sihanoukville",
    "collected_at": "2026-10-26",
    "days_before_departure": 50,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/kua/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "round_trip",
    "flight_date": "2027-02-22",
    "return_date": "2027-02-25",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 197,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kua/kuala-lumpur-to-kuantan",
    "collected_at": "2026-10-26",
    "days_before_departure": 119,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "round_trip",
    "flight_date": "2027-02-18",
    "return_date": "2027-02-24",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 240,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kua/kuala-lumpur-to-kuantan",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "round_trip",
    "flight_date": "2026-12-09",
    "return_date": "2026-12-12",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 279,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kua/kuala-lumpur-to-kuantan",
    "collected_at": "2026-10-26",
    "days_before_departure": 44,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "KUA",
    "trip_type": "round_trip",
    "flight_date": "2026-12-16",
    "return_date": "2026-12-20",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 301,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/kua/kuala-lumpur-to-kuantan",
    "collected_at": "2026-10-26",
    "days_before_departure": 51,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/lbu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LBU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-14",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 527,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/lbu/kuala-lumpur-to-labuan",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/lgk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LGK",
    "trip_type": "round_trip",
    "flight_date": "2026-11-26",
    "return_date": "2026-11-29",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 249,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/lgk/kuala-lumpur-to-langkawi",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/lop/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LOP",
    "trip_type": "round_trip",
    "flight_date": "2026-11-16",
    "return_date": "2026-11-23",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "Batik air",
    "price": 1051,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/lop/kuala-lumpur-to-lombok",
    "collected_at": "2026-10-26",
    "days_before_departure": 21,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/lpq/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "LPQ",
    "trip_type": "round_trip",
    "flight_date": "2026-10-30",
    "return_date": "2026-11-03",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 1119,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/lpq/kuala-lumpur-to-luang-prabang",
    "collected_at": "2026-10-26",
    "days_before_departure": 4,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/mnl/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "MNL",
    "trip_type": "round_trip",
    "flight_date": "2026-11-05",
    "return_date": "2026-11-08",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Philippine Airlines",
    "price": 1294,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/mnl/kuala-lumpur-to-manila",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/myy/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "MYY",
    "trip_type": "round_trip",
    "flight_date": "2027-01-13",
    "return_date": "2027-01-17",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 377,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/myy/kuala-lumpur-to-miri",
    "collected_at": "2026-10-26",
    "days_before_departure": 79,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/pdg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PDG",
    "trip_type": "round_trip",
    "flight_date": "2026-12-01",
    "return_date": "2026-12-05",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Scoot",
    "price": 510,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pdg/kuala-lumpur-to-padang",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/pen/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-28",
    "return_date": "2026-11-30",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 238,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-05",
    "return_date": "2026-11-09",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 245,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-08",
    "return_date": "2026-11-15",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 246,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 13,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-04",
    "return_date": "2026-11-06",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 252,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-04",
    "return_date": "2026-11-08",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 253,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 9,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-01",
    "return_date": "2026-11-09",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 254,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 6,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "PEN",
    "trip_type": "round_trip",
    "flight_date": "2026-11-30",
    "return_date": "2026-12-01",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "Malindo Air",
    "price": 342,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pen/kuala-lumpur-to-penang",
    "collected_at": "2026-10-26",
    "days_before_departure": 35,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/pku/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PKU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-06",
    "return_date": "2026-11-09",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Scoot",
    "price": 688,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pku/kuala-lumpur-to-pekanbaru",
    "collected_at": "2026-10-26",
    "days_before_departure": 11,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/plm/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PLM",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-17",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 391,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/plm/kuala-lumpur-to-palembang",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/pnk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "round_trip",
    "flight_date": "2026-11-19",
    "return_date": "2026-12-03",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 521,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pnk/kuala-lumpur-to-pontianak",
    "collected_at": "2026-10-26",
    "days_before_departure": 24,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/pqc/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "PQC",
    "trip_type": "round_trip",
    "flight_date": "2026-12-01",
    "return_date": "2026-12-05",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 637,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/pqc/kuala-lumpur-to-phu-quoc",
    "collected_at": "2026-10-26",
    "days_before_departure": 36,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/rgn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-02-21",
    "return_date": "2027-02-28",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Malaysia Airlines",
    "price": 758,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 118,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-02-14",
    "return_date": "2027-02-21",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Malaysia Airlines",
    "price": 858,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 111,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-02-19",
    "return_date": "2027-02-26",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Myanmar Airways International",
    "price": 1075,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 116,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-01-30",
    "return_date": "2027-02-20",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "Myanmar Airways International",
    "price": 1255,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 96,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-01-16",
    "return_date": "2027-01-24",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "Myanmar Airways International",
    "price": 1253,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 82,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "RGN",
    "trip_type": "round_trip",
    "flight_date": "2027-02-28",
    "return_date": "2027-03-07",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Myanmar Airways International",
    "price": 1275,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/rgn/kuala-lumpur-to-yangon?flightType=ONE_WAY",
    "collected_at": "2026-10-26",
    "days_before_departure": 125,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/sai/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SAI",
    "trip_type": "round_trip",
    "flight_date": "2026-11-09",
    "return_date": "2026-11-12",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "AirAsia Cambodia",
    "price": 799,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sai/kuala-lumpur-to-siem-reap-angkor-intl-airport",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/sbw/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SBW",
    "trip_type": "round_trip",
    "flight_date": "2027-05-04",
    "return_date": "2027-05-09",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 316,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sbw/kuala-lumpur-to-sibu",
    "collected_at": "2026-10-26",
    "days_before_departure": 190,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/sdk/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SDK",
    "trip_type": "round_trip",
    "flight_date": "2027-02-18",
    "return_date": "2027-02-24",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 418,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sdk/kuala-lumpur-to-sandakan",
    "collected_at": "2026-10-26",
    "days_before_departure": 115,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/sgn/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SGN",
    "trip_type": "round_trip",
    "flight_date": "2027-05-17",
    "return_date": "2027-05-21",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 657,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sgn/kuala-lumpur-to-ho-chi-minh-city",
    "collected_at": "2026-10-26",
    "days_before_departure": 203,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/sin/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SIN",
    "trip_type": "round_trip",
    "flight_date": "2027-04-16",
    "return_date": "2027-04-18",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 401,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sin/kuala-lumpur-to-singapore",
    "collected_at": "2026-10-26",
    "days_before_departure": 172,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/sub/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-16",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "Indonesia AirAsia",
    "price": 636,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sub/kuala-lumpur-to-surabaya",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "round_trip",
    "flight_date": "2027-02-17",
    "return_date": "2027-02-19",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 620,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sub/kuala-lumpur-to-surabaya?flightType=roundtrip",
    "collected_at": "2026-10-26",
    "days_before_departure": 114,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "round_trip",
    "flight_date": "2027-05-19",
    "return_date": "2027-05-22",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Indonesia AirAsia",
    "price": 655,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/sub/kuala-lumpur-to-surabaya?flightType=roundtrip",
    "collected_at": "2026-10-26",
    "days_before_departure": 205,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面标明报价在过去 7 天内可查，并在当前列表标出具体行程日期；未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/twu/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-13",
    "return_date": "2026-11-19",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 597,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 18,
    "price_basis": "per traveller, return total"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-21",
    "return_date": "2026-11-25",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "Malindo Air",
    "price": 662,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2027-01-15",
    "return_date": "2027-01-17",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 669,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 81,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-21",
    "return_date": "2026-11-25",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "Malindo Air",
    "price": 669,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 26,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-11",
    "return_date": "2026-11-15",
    "weekday": "Wednesday",
    "is_weekend": false,
    "airline": "Malaysia Airlines",
    "price": 677,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 16,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-28",
    "return_date": "2026-12-19",
    "weekday": "Saturday",
    "is_weekend": true,
    "airline": "AirAsia",
    "price": 702,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 33,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-12-03",
    "return_date": "2026-12-06",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 706,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 38,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2027-01-17",
    "return_date": "2027-01-20",
    "weekday": "Sunday",
    "is_weekend": true,
    "airline": "Malaysia Airlines",
    "price": 709,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 83,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2027-01-15",
    "return_date": "2027-01-17",
    "weekday": "Friday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 711,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 81,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  },
  {
    "origin": "KUL",
    "destination": "TWU",
    "trip_type": "round_trip",
    "flight_date": "2026-11-26",
    "return_date": "2026-12-02",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "Firefly",
    "price": 736,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/twu/kuala-lumpur-to-tawau",
    "collected_at": "2026-10-26",
    "days_before_departure": 31,
    "price_basis": "per traveller, return total",
    "source_freshness_note": "Expedia 页面说明该价格在过去 7 天内可查；记录为页面列出的具体日期报价。网页索引内容未在下单流程逐项复核，价格与可售性可能变化。"
  }
]

},"price-intelligence/round-trips/routes/upg/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "UPG",
    "trip_type": "round_trip",
    "flight_date": "2026-11-09",
    "return_date": "2026-11-17",
    "weekday": "Monday",
    "is_weekend": false,
    "airline": "Scoot",
    "price": 1146,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/upg/kuala-lumpur-to-makassar",
    "collected_at": "2026-10-26",
    "days_before_departure": 14,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/vte/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "VTE",
    "trip_type": "round_trip",
    "flight_date": "2026-11-10",
    "return_date": "2026-11-14",
    "weekday": "Tuesday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 751,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/vte/kuala-lumpur-to-vientiane",
    "collected_at": "2026-10-26",
    "days_before_departure": 15,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/round-trips/routes/yia/observations-data.js":function(module,exports,require){
module.exports = [
  {
    "origin": "KUL",
    "destination": "YIA",
    "trip_type": "round_trip",
    "flight_date": "2026-11-05",
    "return_date": "2026-11-12",
    "weekday": "Thursday",
    "is_weekend": false,
    "airline": "AirAsia",
    "price": 778,
    "currency": "MYR",
    "baggage": "unknown",
    "is_holiday": null,
    "source": "Expedia Malaysia",
    "source_observation_type": "public round-trip fare listing",
    "source_url": "https://www.expedia.com.my/lp/flights/kul/yia/kuala-lumpur-to-yogyakarta",
    "collected_at": "2026-10-26",
    "days_before_departure": 10,
    "price_basis": "per traveller, return total"
  }
]

},"price-intelligence/live-route-analysis.js":function(module,exports,require){
'use strict'

const currency = require("utils/currency-config.js")
const { holidayForDate, holidayDistance } = require("price-intelligence/malaysia-holidays.js")
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const LEAD_RANGES = [
  { label: '0–3 days', min: 0, max: 3 }, { label: '4–7 days', min: 4, max: 7 },
  { label: '8–14 days', min: 8, max: 14 }, { label: '15–30 days', min: 15, max: 30 },
  { label: '31–60 days', min: 31, max: 60 }, { label: '60+ days', min: 61, max: Infinity }
]
const DURATION_RANGES = [
  { label: '1–3 晚', min: 1, max: 3 }, { label: '4–7 晚', min: 4, max: 7 },
  { label: '8–14 晚', min: 8, max: 14 }, { label: '15 晚以上', min: 15, max: Infinity }
]
const round = value => value == null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100
const recordKind = row => row.record_kind || ((row.flight_date || '') < String(row.collected_at || row.last_seen || '').slice(0, 10) ? 'historical_public_quote' : 'public_quote')
const withinPastYear = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 365)
  return date >= cutoff.toISOString().slice(0, 10) && date <= today
}
const isWithinRecordWindow = row => {
  const kind = recordKind(row)
  if (kind === 'documented_transaction') return withinPastYear(row.order_date)
  const departure = row.flight_date || row.departure_date || ''
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return departure >= today || withinPastYear(departure)
}
const median = values => {
  const sorted = values.slice().sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const quantile = (values, p) => {
  const sorted = values.slice().sort((a, b) => a - b)
  if (!sorted.length) return null
  const position = (sorted.length - 1) * p
  const low = Math.floor(position), high = Math.ceil(position)
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low)
}
const summarize = values => values.length
  ? { count: values.length, average: round(values.reduce((sum, value) => sum + value, 0) / values.length), median: round(median(values)) }
  : { count: 0, average: null, median: null }
const weekday = date => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
const dayDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

function emptyReport(destination, tripType, sourceCurrency) {
  return {
    route: { origin: 'KUL', destination, trip_type: tripType, currency: sourceCurrency || 'MYR' },
    sample: { observation_count: 0, distinct_departure_dates: 0, sources: [], collection_dates: [], record_type_counts: {}, reference_level: '较低', reference_reason: '', source_freshness_note: '' },
    price_distribution_raw_quotes: {},
    weekday_effect_by_departure_date_median: { weekdays: {}, lowest_average_day: null, highest_average_day: null, weekday_average: null, weekend_average: null, weekend_premium_percentage: null },
    advance_purchase_window_by_departure_date_median: { buckets: [], lowest_average_window: null },
    holiday_effect: { status: 'insufficient', message: '正在依据吉隆坡官方假期日历匹配航班日期。' },
    round_trip_duration: { median_nights: null, buckets: [] }
  }
}

function analyzeWithLiveFares(baseReport, baselineRows, liveRows, cloudSummary, routeInfo) {
  const route = routeInfo || (baseReport && baseReport.route) || {}
  const tripType = route.tripType || (baseReport && baseReport.route.trip_type) || 'one_way'
  const destination = route.destination || (baseReport && baseReport.route.destination)
  const validLive = (liveRows || []).filter(row => row && row.trip_type === tripType && row.flight_date && Number.isFinite(Number(row.price)) && isWithinRecordWindow(row))
  const reportBase = baseReport || (validLive.length ? emptyReport(destination, tripType, validLive[0].currency) : null)
  if (!reportBase) return null
  const rowsByIdentity = new Map()
  const add = (row, live) => {
    if (!row || row.trip_type !== tripType || !row.flight_date || !Number.isFinite(Number(row.price)) || !isWithinRecordWindow(row)) return
    const itinerary = tripType === 'round_trip' ? (row.return_date || '') : ''
    const identity = [recordKind(row), row.source_url || row.source || 'unknown', row.destination, row.trip_type, row.flight_date, itinerary].join('|')
    const sourceCurrency = row.source_currency || row.currency || (baseReport && baseReport.route && baseReport.route.currency) || 'MYR'
    const cnyPrice = row.price_cny !== undefined && Number.isFinite(Number(row.price_cny))
      ? Number(row.price_cny)
      : currency.toCny(Number(row.price), sourceCurrency)
    if (cnyPrice === null) return
    const normalizedRow = Object.assign({}, row, {
      source_price: row.source_price === undefined ? Number(row.price) : row.source_price,
      source_currency: sourceCurrency,
      price: cnyPrice,
      currency: 'CNY'
    })
    const old = rowsByIdentity.get(identity)
    const timestamp = String(row.last_seen_at || row.observed_at || row.last_seen || row.collected_at || '')
    const oldTimestamp = old ? String(old.row.last_seen_at || old.row.observed_at || old.row.last_seen || old.row.collected_at || '') : ''
    if (!old || timestamp > oldTimestamp || (timestamp === oldTimestamp && live && !old.live)) rowsByIdentity.set(identity, { row: normalizedRow, live })
  }
  ;(baselineRows || []).forEach(row => add(row, false))
  validLive.forEach(row => add(row, true))
  const observations = [...rowsByIdentity.values()].map(item => item.row)
  const report = JSON.parse(JSON.stringify(reportBase))
  report.live_observation_count = validLive.length
  report.live_unique_observation_count = new Set(validLive.map(row => [recordKind(row), row.source_url || row.source || 'unknown', row.destination || destination, row.trip_type, row.flight_date, tripType === 'round_trip' ? (row.return_date || '') : ''].join('|'))).size
  report.cloud_summary = cloudSummary || null
  if (!observations.length) return report
  report.route.currency = 'CNY'

  const values = observations.map(row => Number(row.price))
  const dates = new Map()
  observations.forEach(row => {
    const key = tripType === 'round_trip' ? `${row.flight_date}|${row.return_date || ''}` : row.flight_date
    if (!dates.has(key)) dates.set(key, [])
    dates.get(key).push(row)
  })
  const samples = [...dates.entries()].map(([key, grouped]) => {
    const first = grouped[0]
    const departure = first.flight_date
    const day = weekday(departure)
    const leadOffsets = grouped.map(row => {
      if (row.days_before_departure !== null && row.days_before_departure !== '' && Number.isFinite(Number(row.days_before_departure))) return Number(row.days_before_departure)
      const referenceDate = row.purchase_date || row.quoted_at || row.collected_at || row.last_seen
      return referenceDate ? dayDiff(referenceDate, departure) : -1
    }).filter(value => value >= 0)
    const daysBefore = leadOffsets.length ? Math.min(...leadOffsets) : -1
    return {
      key, departure, day, weekend: day === 'Saturday' || day === 'Sunday',
      price: median(grouped.map(row => Number(row.price))),
      daysBefore,
      returnDate: tripType === 'round_trip' ? (first.return_date || '') : '',
      duration: tripType === 'round_trip' && first.return_date ? dayDiff(departure, first.return_date) : null
    }
  })
  const holidayTaggedSamples = samples.map(sample => {
    const matches = [holidayForDate(sample.departure), holidayForDate(sample.returnDate)].filter(Boolean)
    matches.sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))
    return Object.assign({}, sample, { holiday: matches[0] || null })
  })
  const holidaySamples = holidayTaggedSamples.filter(sample => sample.holiday)
  const comparisonSamples = holidayTaggedSamples.filter(sample => {
    if (sample.holiday) return false
    const distance = holidayDistance(sample.departure)
    return distance >= 7 && distance <= 35
  })
  const holidayDateCount = new Set(holidaySamples.map(sample => sample.departure)).size
  const comparisonDateCount = new Set(comparisonSamples.map(sample => sample.departure)).size
  const holidayMedian = median(holidaySamples.map(sample => sample.price))
  const comparisonMedian = median(comparisonSamples.map(sample => sample.price))
  const holidayEffectReady = holidayDateCount >= 3 && comparisonDateCount >= 3 && comparisonMedian > 0
  const weekdays = {}
  DAYS.forEach(day => { weekdays[day] = summarize(samples.filter(sample => sample.day === day).map(sample => sample.price)) })
  const weekdayValues = samples.filter(sample => !sample.weekend).map(sample => sample.price)
  const weekendValues = samples.filter(sample => sample.weekend).map(sample => sample.price)
  const weekdayAverage = weekdayValues.length ? weekdayValues.reduce((sum, value) => sum + value, 0) / weekdayValues.length : null
  const weekendAverage = weekendValues.length ? weekendValues.reduce((sum, value) => sum + value, 0) / weekendValues.length : null
  const ordered = Object.entries(weekdays).filter(([, item]) => item.count).sort((a, b) => a[1].average - b[1].average)
  const leadBuckets = LEAD_RANGES.map(range => ({ range: range.label, ...summarize(samples.filter(sample => sample.daysBefore >= range.min && sample.daysBefore <= range.max).map(sample => sample.price)) }))
  const allSources = [...new Set(observations.map(row => row.source).filter(Boolean))]
  const collectionDates = [...new Set(observations.map(row => row.collected_at || row.last_seen).filter(Boolean))].sort()
  const recordTypeCounts = observations.reduce((counts, row) => {
    const type = recordKind(row)
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})

  report.price_distribution_raw_quotes = {
    count: values.length, minimum: Math.min(...values), p10: round(quantile(values, .1)), p25: round(quantile(values, .25)),
    median: round(quantile(values, .5)), p75: round(quantile(values, .75)), p90: round(quantile(values, .9)), maximum: Math.max(...values)
  }
  report.weekday_effect_by_departure_date_median = {
    weekdays, lowest_average_day: ordered[0] ? ordered[0][0] : null, highest_average_day: ordered.length ? ordered[ordered.length - 1][0] : null,
    weekday_average: round(weekdayAverage), weekend_average: round(weekendAverage),
    weekend_premium_percentage: weekdayAverage && weekendAverage ? round((weekendAverage - weekdayAverage) / weekdayAverage * 100) : null,
    method: '按来源与行程日期保留最新一条报价，再按出发日期中位数描述汇总；不是稳定规律'
  }
  report.advance_purchase_window_by_departure_date_median = {
    buckets: leadBuckets,
    lowest_average_window: leadBuckets.filter(bucket => bucket.count).sort((a, b) => a.average - b.average)[0]?.range || null,
    method: '以每条报价的采集日计算提前天数；同一来源和行程日期仅取最新观察，不能推断同一航班价格随时间变化'
  }
  report.holiday_effect = {
    status: holidayEffectReady ? 'estimated' : 'insufficient',
    holiday_sample_count: holidaySamples.length,
    holiday_date_count: holidayDateCount,
    comparison_sample_count: comparisonSamples.length,
    comparison_date_count: comparisonDateCount,
    holiday_median: round(holidayMedian),
    comparison_median: round(comparisonMedian),
    difference_percentage: holidayEffectReady ? round((holidayMedian - comparisonMedian) / comparisonMedian * 100) : null,
    holiday_window_days: 3,
    comparison_window_days: '7–35',
    calendar_scope: '吉隆坡联邦直辖区',
    method: '按官方假期日前后3天标记；往返任一航段命中即归入假期样本。以假期附近7–35天且未命中假期窗口的样本作描述性对照；不表示因果关系。'
  }
  if (tripType === 'round_trip') {
    const durations = samples.map(sample => sample.duration).filter(value => Number.isFinite(value) && value > 0)
    report.round_trip_duration = {
      median_nights: median(durations),
      buckets: DURATION_RANGES.map(range => ({ range: range.label, ...summarize(samples.filter(sample => sample.duration >= range.min && sample.duration <= range.max).map(sample => sample.price)) })),
      method: '按去程与返程日期差计算晚数；仅为描述性比较'
    }
    report.sample.distinct_itineraries = samples.length
  }
  report.sample.observation_count = observations.length
  report.sample.distinct_departure_dates = new Set(samples.map(sample => sample.departure)).size
  report.sample.sources = allSources
  report.sample.collection_dates = collectionDates
  report.sample.record_type_counts = recordTypeCounts
  report.sample.reference_level = observations.length >= 200 ? '较高' : observations.length >= 50 ? '一般' : '较低'
  report.sample.reference_reason = `合并 ${observations.length} 条本地与云端样本，其中当前云端有 ${report.live_unique_observation_count} 条匹配记录；记录类型分别展示，相同来源、行程和记录类型仅保留最新记录。`
  report.sample.source_freshness_note = cloudSummary && cloudSummary.generated_at
    ? `每日任务分析于 ${cloudSummary.generated_at} 生成；来源网页仍按每 7 天轮询，仅纳入近一年内的过去日期报价与带日期的网页订单记录。订单记录按页面自述识别，未独立核验。`
    : '过去日期报价和网页订单记录仅保留近一年；订单记录须有带日期的公开下单或付款描述，按页面自述识别，未独立核验。'
  report.live_source_urls = [...new Set(validLive.map(row => row.source_url).filter(Boolean))]
  return report
}

module.exports = { analyzeWithLiveFares }

},"price-intelligence/malaysia-holidays.js":function(module,exports,require){
'use strict'

// Official federal and Kuala Lumpur (Federal Territory) public holidays.
// Islamic dates can be revised by official announcement. Refresh this list
// when BKPP/JPM publishes or amends a yearly schedule.
// Source schedules: https://www.kabinet.gov.my/storage/2024/11/hka_2025.pdf
// https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf
// https://www.kabinet.gov.my/storage/2026/08/HKA_2027.pdf
const KUALA_LUMPUR_HOLIDAYS = [
  // 2025
  { date: '2025-01-01', name: '元旦', name_en: "New Year's Day" },
  { date: '2025-01-29', name: '农历新年', name_en: 'Chinese New Year' },
  { date: '2025-01-30', name: '农历新年第二天', name_en: 'Chinese New Year, second day' },
  { date: '2025-02-01', name: '联邦直辖区日', name_en: 'Federal Territory Day' },
  { date: '2025-02-11', name: '大宝森节', name_en: 'Thaipusam' },
  { date: '2025-03-18', name: '可兰经降世日', name_en: 'Nuzul Al-Quran' },
  { date: '2025-03-31', name: '开斋节', name_en: 'Hari Raya Aidilfitri' },
  { date: '2025-04-01', name: '开斋节第二天', name_en: 'Hari Raya Aidilfitri, second day' },
  { date: '2025-05-01', name: '劳动节', name_en: 'Labour Day' },
  { date: '2025-05-12', name: '卫塞节', name_en: 'Wesak Day' },
  { date: '2025-06-02', name: '国家元首华诞', name_en: 'Yang di-Pertuan Agong’s Birthday' },
  { date: '2025-06-07', name: '哈芝节', name_en: 'Hari Raya Aidiladha' },
  { date: '2025-06-27', name: '回历元旦', name_en: 'Awal Muharram' },
  { date: '2025-08-31', name: '国庆日', name_en: 'National Day' },
  { date: '2025-09-01', name: '国庆日补假', name_en: 'National Day replacement holiday' },
  { date: '2025-09-05', name: '先知穆罕默德诞辰', name_en: 'Maulidur Rasul' },
  { date: '2025-09-15', name: '马来西亚日特别假期', name_en: 'Special Malaysia Day holiday' },
  { date: '2025-09-16', name: '马来西亚日', name_en: 'Malaysia Day' },
  { date: '2025-10-20', name: '屠妖节', name_en: 'Deepavali' },
  { date: '2025-12-25', name: '圣诞节', name_en: 'Christmas Day' },

  // 2026
  { date: '2026-01-01', name: '元旦', name_en: "New Year's Day" },
  { date: '2026-02-01', name: '大宝森节／联邦直辖区日', name_en: 'Thaipusam / Federal Territory Day' },
  { date: '2026-02-17', name: '农历新年', name_en: 'Chinese New Year' },
  { date: '2026-02-18', name: '农历新年第二天', name_en: 'Chinese New Year, second day' },
  { date: '2026-03-07', name: '可兰经降世日', name_en: 'Nuzul Al-Quran' },
  { date: '2026-03-20', name: '开斋节额外公共假期', name_en: 'Additional Hari Raya public holiday' },
  { date: '2026-03-21', name: '开斋节', name_en: 'Hari Raya Aidilfitri' },
  { date: '2026-03-22', name: '开斋节第二天', name_en: 'Hari Raya Aidilfitri, second day' },
  { date: '2026-05-01', name: '劳动节', name_en: 'Labour Day' },
  { date: '2026-05-27', name: '哈芝节', name_en: 'Hari Raya Aidiladha' },
  { date: '2026-05-31', name: '卫塞节', name_en: 'Wesak Day' },
  { date: '2026-06-01', name: '国家元首华诞', name_en: 'Yang di-Pertuan Agong’s Birthday' },
  { date: '2026-06-02', name: '卫塞节补假', name_en: 'Wesak Day replacement holiday' },
  { date: '2026-06-17', name: '回历元旦', name_en: 'Awal Muharram' },
  { date: '2026-08-25', name: '先知穆罕默德诞辰', name_en: 'Maulidur Rasul' },
  { date: '2026-08-31', name: '国庆日', name_en: 'National Day' },
  { date: '2026-09-16', name: '马来西亚日', name_en: 'Malaysia Day' },
  { date: '2026-11-08', name: '屠妖节', name_en: 'Deepavali' },
  { date: '2026-12-25', name: '圣诞节', name_en: 'Christmas Day' },

  // 2027: federal dates plus Kuala Lumpur-specific holidays from the annual schedule.
  { date: '2027-01-01', name: '元旦', name_en: "New Year's Day" },
  { date: '2027-01-22', name: '大宝森节', name_en: 'Thaipusam' },
  { date: '2027-02-01', name: '联邦直辖区日', name_en: 'Federal Territory Day' },
  { date: '2027-02-06', name: '农历新年', name_en: 'Chinese New Year' },
  { date: '2027-02-07', name: '农历新年第二天', name_en: 'Chinese New Year, second day' },
  { date: '2027-02-24', name: '可兰经降世日', name_en: 'Nuzul Al-Quran' },
  { date: '2027-03-10', name: '开斋节', name_en: 'Hari Raya Aidilfitri' },
  { date: '2027-03-11', name: '开斋节第二天', name_en: 'Hari Raya Aidilfitri, second day' },
  { date: '2027-05-01', name: '劳动节', name_en: 'Labour Day' },
  { date: '2027-05-17', name: '哈芝节', name_en: 'Hari Raya Aidiladha' },
  { date: '2027-05-20', name: '卫塞节', name_en: 'Wesak Day' },
  { date: '2027-06-06', name: '回历元旦', name_en: 'Awal Muharram' },
  { date: '2027-06-07', name: '国家元首华诞', name_en: 'Yang di-Pertuan Agong’s Birthday' },
  { date: '2027-08-15', name: '先知穆罕默德诞辰', name_en: 'Maulidur Rasul' },
  { date: '2027-08-31', name: '国庆日', name_en: 'National Day' },
  { date: '2027-09-16', name: '马来西亚日', name_en: 'Malaysia Day' },
  { date: '2027-10-28', name: '屠妖节', name_en: 'Deepavali' },
  { date: '2027-12-25', name: '圣诞节', name_en: 'Christmas Day' }
]

function dayDistance(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

function holidayForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null
  let closest = null
  KUALA_LUMPUR_HOLIDAYS.forEach(holiday => {
    const distance = dayDistance(holiday.date, date)
    if (Math.abs(distance) > 3) return
    if (!closest || Math.abs(distance) < Math.abs(closest.distance)) closest = Object.assign({ distance }, holiday)
  })
  return closest
}

function holidayDistance(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return Infinity
  return Math.min(...KUALA_LUMPUR_HOLIDAYS.map(holiday => Math.abs(dayDistance(holiday.date, date))))
}

module.exports = { KUALA_LUMPUR_HOLIDAYS, holidayForDate, holidayDistance }

}};
window.MINI_PAGES={"index":{"entry":"pages/index/index.js","template":"<view class=\"page\">\n  <view class=\"top-bar\">\n    <view class=\"brand\">\n      <view class=\"brand-icon\"><image class=\"brand-logo\" style=\"width:72rpx;height:72rpx;display:block;\" src=\"../../assets/may-logo.png\" mode=\"aspectFill\" /></view>\n      <text class=\"brand-name\">MAY去哪啊</text>\n    </view>\n    <view class=\"top-controls\">\n      <view class=\"currency-switch\" bindtap=\"selectCurrency\"><text class=\"currency-icon\">{{currencySymbol}}</text><text>{{displayCurrency}}</text><view class=\"currency-arrow\"></view></view>\n      <view class=\"language-switch\">\n        <view class=\"language-option {{language === 'en' ? 'language-option-active' : ''}}\" data-language=\"en\" bindtap=\"selectLanguage\">{{isEnglish ? 'English' : '英语'}}</view>\n        <view class=\"language-option {{language === 'zh' ? 'language-option-active' : ''}}\" data-language=\"zh\" bindtap=\"selectLanguage\">{{isEnglish ? 'Chinese' : '简体中文'}}</view>\n      </view>\n    </view>\n  </view>\n\n  <view class=\"hero\">\n    <text class=\"hero-kicker\">FLIGHT PRICE INTELLIGENCE</text>\n    <text class=\"hero-title\">{{isEnglish ? 'Understand Flight Price Trends' : '了解航线价格规律'}}</text>\n    <text class=\"hero-description\">{{isEnglish ? 'See when fares on this route are usually higher or more affordable.' : '看看这条航线通常什么时候贵、什么时候相对划算。'}}</text>\n  </view>\n\n  <view class=\"search-card\">\n    <view class=\"field trip-type-field\">\n      <text class=\"field-title\">{{isEnglish ? 'Trip type' : '行程类型'}}</text>\n      <view class=\"trip-type-switch\">\n        <view class=\"trip-type-option {{tripType === 'one_way' ? 'trip-type-option-active' : ''}}\" data-trip-type=\"one_way\" bindtap=\"selectTripType\">{{isEnglish ? 'One way' : '单程'}}</view>\n        <view class=\"trip-type-option {{tripType === 'round_trip' ? 'trip-type-option-active' : ''}}\" data-trip-type=\"round_trip\" bindtap=\"selectTripType\">{{isEnglish ? 'Round trip' : '往返'}}</view>\n      </view>\n    </view>\n\n    <view class=\"field\">\n      <text class=\"field-title\">{{isEnglish ? 'From' : '出发地'}}</text>\n      <view class=\"route-field fixed-origin\">\n        <view class=\"airport-icon\">{{isEnglish ? 'From' : '出'}}</view>\n        <view class=\"route-copy\">\n          <text class=\"route-city\">{{originLabel}}</text>\n      <text class=\"route-detail\">{{originCode}} · Kuala Lumpur International Airport</text>\n        </view>\n        <text class=\"fixed-tag\">{{isEnglish ? 'Fixed' : '固定'}}</text>\n      </view>\n    </view>\n\n    <view class=\"route-divider\"><view></view><text>{{isEnglish ? 'ROUTE' : '航线'}}</text><view></view></view>\n\n    <view class=\"field destination-field\">\n      <text class=\"field-title\">{{isEnglish ? 'To' : '目的地'}}</text>\n      <view class=\"route-field destination-picker-trigger\" bindtap=\"openDestinationPicker\">\n        <view class=\"airport-icon destination-icon\">{{isEnglish ? 'To' : '到'}}</view>\n        <view class=\"route-copy\">\n          <text class=\"route-city\">{{destinationLabel}}</text>\n          <text class=\"route-detail\">{{destinationCode}} · {{destinations[destinationIndex].detail}}</text>\n        </view>\n        <text class=\"picker-arrow\">⌄</text>\n      </view>\n    </view>\n\n    <button class=\"primary-button\" bindtap=\"viewAnalysis\"><text class=\"button-label\">{{isEnglish ? 'View fare trends' : '查看价格规律'}}</text><text class=\"button-arrow\">→</text></button>\n  </view>\n\n  <view class=\"pool-heading\"><text>{{isEnglish ? 'Popular Southeast Asian destinations' : '东南亚热门目的地'}}</text><text>{{isEnglish ? 'Top 10 by sample size' : '样本量前 10'}}</text></view>\n  <view class=\"destination-grid\">\n    <view class=\"destination-tile {{item.code === destinationCode ? 'destination-tile-active' : ''}}\" wx:for=\"{{topDestinations}}\" wx:key=\"code\" data-code=\"{{item.code}}\" hover-class=\"destination-tile-pressed\" bindtap=\"selectDestination\">\n      <view class=\"destination-tile-top\"><text class=\"destination-tile-name\">{{item.label}}</text><text class=\"destination-tile-code\">{{item.code}}</text></view>\n      <text class=\"destination-tile-country\">{{item.country}}</text>\n      <text class=\"destination-tile-status {{item.hasAnalysis ? 'destination-ready' : ''}}\">{{item.sampleCount}} {{isEnglish ? (tripType === 'round_trip' ? 'round-trip' : 'one-way') + ' samples' : '条' + (tripType === 'round_trip' ? '往返' : '单程') + '样本'}}</text>\n    </view>\n  </view>\n\n  <view class=\"section-title\">{{isEnglish ? 'What this analysis shows' : '这份分析会告诉你'}}</view>\n  <view class=\"feature-card\">\n    <view class=\"feature-row\"><view class=\"feature-icon\">↗</view><view><text class=\"feature-name\">{{isEnglish ? 'Departure weekday' : '出发星期'}}</text><text class=\"feature-copy\">{{isEnglish ? 'Compare fares by departure day' : '比较一周中不同出发日的价格差异'}}</text></view></view>\n    <view class=\"feature-row\"><view class=\"feature-icon\">％</view><view><text class=\"feature-name\">{{isEnglish ? 'Weekend effect' : '周末影响'}}</text><text class=\"feature-copy\">{{isEnglish ? 'Compare average weekend and weekday fares' : '观察周末与工作日的平均价格差距'}}</text></view></view>\n    <view class=\"feature-row\"><view class=\"feature-icon\">◷</view><view><text class=\"feature-name\">{{isEnglish ? 'Fare range' : '价格区间'}}</text><text class=\"feature-copy\">{{isEnglish ? 'Explore sample distribution and booking lead time' : '查看样本分布与提前购买区间'}}</text></view></view>\n  </view>\n\n  <view class=\"footer\">{{isEnglish ? 'Based on publicly listed fare samples. Live flight search and booking are not available.' : '基于公开页面价格样本进行统计，不提供实时机票搜索或订票。'}}</view>\n\n  <view class=\"public-fares-section\">\n    <view class=\"public-fares-heading\">{{isEnglish ? 'Latest public-page fares' : '最新公开网页报价'}} <text>{{isEnglish ? 'Daily job · Beijing 00:00' : '每日任务 · 北京时间零点'}}</text></view>\n    <view class=\"public-fares-card\">\n      <view wx:if=\"{{collectorStatusLabel}}\" class=\"public-fares-status\">{{collectorStatusLabel}}</view>\n    </view>\n  </view>\n\n  <view class=\"destination-picker-mask\" wx:if=\"{{showDestinationPicker}}\" catchtap=\"closeDestinationPicker\">\n    <view class=\"destination-picker-panel\" catchtap=\"stopPickerTap\">\n      <view class=\"destination-picker-header\">\n        <text class=\"destination-picker-cancel\" bindtap=\"closeDestinationPicker\">{{pickerCancel}}</text>\n        <text class=\"destination-picker-title\">{{pickerTitle}}</text>\n        <text class=\"destination-picker-confirm\" bindtap=\"confirmDestinationPicker\">{{pickerConfirm}}</text>\n      </view>\n      <view class=\"destination-search-box\">\n        <text class=\"destination-search-icon\">⌕</text>\n        <input class=\"destination-search-input\" value=\"{{destinationSearchKeyword}}\" placeholder=\"{{searchPlaceholder}}\" confirm-type=\"search\" bindinput=\"onDestinationSearchInput\" />\n        <text wx:if=\"{{destinationSearchKeyword}}\" class=\"destination-search-clear\" bindtap=\"clearDestinationSearch\">×</text>\n      </view>\n      <scroll-view class=\"destination-picker-list\" scroll-y=\"true\" show-scrollbar=\"false\">\n        <block wx:for=\"{{destinationGroups}}\" wx:for-item=\"letterGroup\" wx:key=\"initial\">\n          <view class=\"destination-letter\">{{letterGroup.initial}}</view>\n          <view class=\"destination-option {{pendingDestinationCode === candidate.code ? 'destination-option-selected' : ''}}\" wx:for=\"{{letterGroup.items}}\" wx:for-item=\"candidate\" wx:key=\"code\" data-code=\"{{candidate.code}}\" bindtap=\"selectDestinationCandidate\">\n            <view class=\"destination-option-copy\"><text class=\"destination-option-name\">{{candidate.label}}</text><text class=\"destination-option-code\">{{candidate.code}}</text></view>\n            <view class=\"destination-option-right\"><text class=\"destination-option-country\">{{candidate.country}}</text><text wx:if=\"{{pendingDestinationCode === candidate.code}}\" class=\"destination-option-check\">✓</text></view>\n          </view>\n        </block>\n        <view wx:if=\"{{destinationGroups.length === 0}}\" class=\"destination-empty\">{{emptyDestination}}</view>\n      </scroll-view>\n    </view>\n  </view>\n</view>\n"},"insights":{"entry":"price-intelligence/pages/insights/insights.js","template":"<view class=\"page\">\n  <view class=\"top-bar\"><view class=\"brand\"><view class=\"brand-icon\"><image class=\"brand-logo\" style=\"width:72rpx;height:72rpx;display:block;\" src=\"../../assets/may-logo.png\" mode=\"aspectFill\" /></view><text class=\"brand-name\">MAY去哪啊</text></view><view class=\"top-controls\"><view class=\"currency-switch\" bindtap=\"selectCurrency\"><text class=\"currency-icon\">{{currencySymbol}}</text><text>{{displayCurrency}}</text><view class=\"currency-arrow\"></view></view><view class=\"language-switch\"><view class=\"language-option {{language === 'en' ? 'language-option-active' : ''}}\" data-language=\"en\" bindtap=\"selectLanguage\">{{isEnglish ? 'English' : '英语'}}</view><view class=\"language-option {{language === 'zh' ? 'language-option-active' : ''}}\" data-language=\"zh\" bindtap=\"selectLanguage\">{{isEnglish ? 'Chinese' : '简体中文'}}</view></view></view></view>\n  <view class=\"hero\"><view class=\"eyebrow\">{{isEnglish ? 'Flight Fare Analysis' : '航线价格分析'}}</view><view class=\"route-title\">{{routeTitle}}</view><view class=\"route-subtitle\">{{routeSubtitle}}</view><view class=\"status-pill\">{{tripTypeLabel}} · {{hasData ? (isEnglish ? 'Sample analysis · ' + sample.referenceLevel : '样本分析 · ' + sample.referenceLevel) : (isEnglish ? 'No samples available' : '暂无可用样本')}}</view></view>\n  <view class=\"unavailable-card\" wx:if=\"{{!hasData}}\"><view class=\"unavailable-icon\">i</view><view class=\"unavailable-title\">{{isEnglish ? tripTypeLabel + ' fare samples are not available yet' : tripTypeLabel + '价格样本尚未收录'}}</view><view class=\"unavailable-copy\">{{isEnglish ? 'No verified public fare samples are available for ' + routeTitle + '. We will not substitute fares from another trip type.' : routeTitle + ' 的' + tripTypeLabel + '分析目前没有可用的真实公开标价。我们不会用其他行程类型的价格生成参考。'}}</view><view class=\"unavailable-copy\">{{isEnglish ? 'Once reliable samples are collected, this page will show the matching fare analysis and sample coverage.' : '收录可靠样本后，页面会展示对应行程类型的人民币价格分析，并注明样本范围。'}}</view></view>\n  <block wx:else>\n    <view class=\"notice-card\"><view class=\"notice-title\">{{isEnglish ? 'About these samples' : '先看样本说明'}}</view><view class=\"notice-copy\">{{isEnglish ? 'Past-date fares are limited to the last year. Public pages with a dated order/payment statement from the last year may be labeled as order records; these statements are not independently authenticated.' : '过去日期报价仅保留近一年。公开网页出现近一年内带日期的下单或付款描述时，可归为网页订单记录；这些页面内容未经独立核验。'}}</view></view>\n    <view class=\"section-heading\">{{isEnglish ? 'Fare Distribution' : '价格分布'}} <text>{{displayCurrency}} · {{isEnglish ? (tripType === 'round_trip' ? 'round-trip total' : 'one-way fare') : (tripType === 'round_trip' ? '往返总价' : '单程标价')}} {{isEnglish ? 'converted' : '换算'}}</text></view>\n    <view class=\"card price-card\"><view class=\"median-label\">{{isEnglish ? (tripType === 'round_trip' ? 'Median Round-trip Fare' : 'Median One-way Fare') : (tripType === 'round_trip' ? '样本往返总价中位数' : '样本单程标价中位数')}}</view><view class=\"median-price\">{{currencySymbol}} {{price.median}}</view><view class=\"range-line\">{{isEnglish ? 'Low' : '最低'}} {{currencySymbol}} {{price.minimum}} <text>—</text> {{isEnglish ? 'High' : '最高'}} {{currencySymbol}} {{price.maximum}}</view><view class=\"quantile-grid\"><view class=\"quantile-item\"><text>P10</text><text>{{currencySymbol}} {{price.p10}}</text></view><view class=\"quantile-item\"><text>P25</text><text>{{currencySymbol}} {{price.p25}}</text></view><view class=\"quantile-item featured\"><text>{{isEnglish ? 'Median' : '中位数'}}</text><text>{{currencySymbol}} {{price.median}}</text></view><view class=\"quantile-item\"><text>P75</text><text>{{currencySymbol}} {{price.p75}}</text></view><view class=\"quantile-item\"><text>P90</text><text>{{currencySymbol}} {{price.p90}}</text></view></view><view class=\"hint\">{{isEnglish ? 'Listed fares come from different dates and sources. Taxes and baggage may vary.' : '分位数来自不同日期和来源的展示标价，税费与行李口径可能不同。'}}</view></view>\n    <view wx:if=\"{{tripType === 'round_trip'}}\"><view class=\"section-heading\">{{isEnglish ? 'Round-trip Duration' : '往返行程时长'}} <text>{{isEnglish ? 'Outbound to return dates' : '按去程与返程日期计算'}}</text></view><view class=\"card duration-card\"><view class=\"median-label\">{{isEnglish ? 'Median nights' : '样本行程晚数中位数'}}</view><view class=\"median-price duration-median\">{{tripDurationMedian}}</view><view class=\"lead-row\" wx:for=\"{{tripDurationRows}}\" wx:key=\"range\"><view class=\"lead-top\"><text class=\"lead-range\">{{item.range}}</text><text wx:if=\"{{item.count}}\">{{currencySymbol}} {{item.average}} <text class=\"lead-count\">· {{item.count}} {{isEnglish ? 'trips' : '个行程'}}</text></text><text wx:else class=\"lead-count\">{{isEnglish ? 'No samples' : '暂无样本'}}</text></view><view class=\"bar-track lead-track\"><view class=\"bar-fill lead-fill\" style=\"width: {{item.width}}\"></view></view></view><view class=\"hint\">{{isEnglish ? 'Fares by stay length depend on dates and sample coverage; shown for reference only.' : '不同停留时长的价格受日期和样本范围影响，仅作描述性参考。'}}</view></view></view>\n    <view class=\"section-heading\">{{isEnglish ? (tripType === 'round_trip' ? 'Outbound Departure Weekday' : 'Departure Weekday') : (tripType === 'round_trip' ? '去程出发星期' : '出发星期')}} <text>{{isEnglish ? 'Average fare by day (' + displayCurrency + ')' : '各星期平均标价（' + displayCurrency + '）'}}</text></view>\n    <view class=\"card weekday-chart-card\"><view class=\"chart-caption\"><view class=\"chart-legend-dot\"></view><text>{{isEnglish ? 'Average fare' : '平均标价'}}</text><view class=\"chart-legend-dot low\"></view><text>{{isEnglish ? 'Lower' : '较低日'}}</text><view class=\"chart-legend-dot high\"></view><text>{{isEnglish ? 'Higher' : '较高日'}}</text></view><view class=\"chart-stage\"><canvas canvas-id=\"weekdayChart\" id=\"weekdayChart\" class=\"chart-canvas\" width=\"300\" height=\"160\" style=\"width: 610rpx; height: 320rpx;\" bindtap=\"onChartTap\" bindtouchstart=\"onChartTap\" bindtouchmove=\"onChartTouchMove\"></canvas><view wx:if=\"{{selectedPoint}}\" class=\"chart-tooltip\" style=\"left: {{selectedPoint.left}}rpx; top: {{selectedPoint.top}}rpx;\"><text>{{selectedPoint.day}}</text><text>{{currencySymbol}} {{selectedPoint.average}}</text></view></view><view class=\"weekday-days\"><view class=\"weekday-day {{item.isLowest ? 'low' : ''}} {{item.isHighest ? 'high' : ''}}\" wx:for=\"{{chartPoints}}\" wx:key=\"day\">{{item.day}}</view></view><view class=\"weekday-extremes\"><view class=\"weekday-extreme low\"><text>{{isEnglish ? 'Lowest sample average' : '样本均价较低'}}</text><text>{{weekdaySummary.lowestDay}} · {{currencySymbol}} {{weekdaySummary.lowestAverage}}</text></view><view class=\"weekday-extreme high\"><text>{{isEnglish ? 'Highest sample average' : '样本均价较高'}}</text><text>{{weekdaySummary.highestDay}} · {{currencySymbol}} {{weekdaySummary.highestAverage}}</text></view></view><view class=\"insight-note\">{{isEnglish ? 'Each weekday has few departure date samples. This chart describes a public fare snapshot and does not predict future prices.' : '每个星期几只有少量出发日期样本；折线是一次公开标价快照的描述，不代表稳定规律或未来票价。'}}</view></view>\n    <view class=\"section-heading\">{{isEnglish ? (tripType === 'round_trip' ? 'Outbound Weekend vs. Weekday' : 'Weekend vs. Weekday') : (tripType === 'round_trip' ? '去程周末与工作日' : '出发周末与工作日')}}</view><view class=\"card compare-card\"><view class=\"compare-headline\">{{weekend.label}}</view><view class=\"compare-values\"><view><text>{{isEnglish ? 'Weekday average' : '工作日均价'}}</text><text class=\"compare-price\">{{currencySymbol}} {{weekend.weekdayAverage}}</text></view><view><text>{{isEnglish ? 'Weekend average' : '周末均价'}}</text><text class=\"compare-price\">{{currencySymbol}} {{weekend.weekendAverage}}</text></view></view><view class=\"hint\">{{weekendNote}}</view></view>\n    <view class=\"section-heading\">{{isEnglish ? (tripType === 'round_trip' ? 'Days Before Outbound Fare Comparison' : 'Days Before Departure Fare Comparison') : (tripType === 'round_trip' ? '距去程出发日的价格对比' : '距出发日的价格对比')}} <text>{{isEnglish ? 'Exploratory' : '探索性结果'}}</text></view><view class=\"card\"><view class=\"lead-row\" wx:for=\"{{leadTimeRows}}\" wx:key=\"range\"><view class=\"lead-top\"><text class=\"lead-range {{item.isLowest ? 'lead-range-highlight' : ''}}\">{{item.range}}</text><text wx:if=\"{{item.count}}\">{{currencySymbol}} {{item.average}} <text class=\"lead-count\">· {{item.count}} {{isEnglish ? 'dates' : '个日期'}}</text></text><text wx:else class=\"lead-count\">{{isEnglish ? 'No samples' : '暂无样本'}}</text></view><view class=\"bar-track lead-track\"><view class=\"bar-fill lead-fill\" style=\"width: {{item.width}}\"></view></view></view><view class=\"insight-note lead-insight-note\"><block wx:if=\"{{hasLeadWindow}}\"><text>{{isEnglish ? 'In this sample, ' : '本次样本中，'}}</text><text class=\"lead-highlight\">{{leadWindow}}</text><text>{{isEnglish ? ' has a relatively lower average. This is not a best time to book.' : '均价相对较低；不同出发日横截面对比，不能称为最佳购票窗口。'}}</text></block><text wx:else>{{isEnglish ? 'There is not enough data to compare booking lead times.' : '当前样本不足，暂时无法比较提前购买时间。'}}</text></view></view>\n      <view class=\"section-heading\">{{isEnglish ? 'Holiday Effects' : '节假日影响'}} <text>{{isEnglish ? 'Observed fare comparison' : '假期窗口与邻近日常标价'}}</text></view>\n      <view class=\"card holiday-card\">\n        <view class=\"holiday-status {{holidayDisplay.changeClass}}\">{{holidayDisplay.changeText}}</view>\n        <view class=\"holiday-comparison\">\n          <view class=\"holiday-period holiday-period-festive\">\n            <view class=\"holiday-period-title\">{{isEnglish ? 'Holiday window' : '假期窗口'}}</view>\n            <view class=\"holiday-price\"><text>{{currencySymbol}}</text> {{holidayDisplay.holidayPrice}}</view>\n            <view class=\"holiday-count\">{{holidayDisplay.holidayCount}} {{isEnglish ? 'departure dates' : '个出发日期'}}</view>\n            <view class=\"holiday-track\"><view class=\"holiday-bar festive-bar\" style=\"width: {{holidayDisplay.holidayBarWidth}}\"></view></view>\n          </view>\n          <view class=\"holiday-period\">\n            <view class=\"holiday-period-title\">{{isEnglish ? 'Nearby usual days' : '邻近日常'}}</view>\n            <view class=\"holiday-price\"><text>{{currencySymbol}}</text> {{holidayDisplay.comparisonPrice}}</view>\n            <view class=\"holiday-count\">{{holidayDisplay.comparisonCount}} {{isEnglish ? 'departure dates' : '个出发日期'}}</view>\n            <view class=\"holiday-track\"><view class=\"holiday-bar usual-bar\" style=\"width: {{holidayDisplay.comparisonBarWidth}}\"></view></view>\n          </view>\n        </view>\n        <view class=\"holiday-note\">{{holidayDisplay.note}}</view>\n        <view class=\"holiday-method\">{{holidayDisplay.method}}</view>\n      </view>\n    <view class=\"sample-card\"><view class=\"sample-title\">{{isEnglish ? 'Data & Reliability' : '数据与参考程度'}}</view><view class=\"sample-stats\"><view><text class=\"sample-number\">{{sample.observationCount}}</text><text>{{isEnglish ? ' records' : '条记录'}}</text></view><view><text class=\"sample-number\">{{sample.dateCount}}</text><text>{{isEnglish ? ' dates' : '个出发日期'}}</text></view><view><text class=\"sample-number\">{{sample.sourceCount}}</text><text>{{isEnglish ? ' sources' : '个公开来源'}}</text></view></view><view class=\"sample-meta\">{{sample.recordBreakdown}}</view><view class=\"sample-meta\">{{isEnglish ? 'Sources: ' : '来源：'}}{{sourceNames}}</view><view class=\"sample-meta\">{{isEnglish ? 'Source freshness: ' : '来源页面时效：'}}{{isEnglish ? sample.sourceFreshnessEnglish : sample.sourceFreshnessNote}}</view><view class=\"sample-meta\">{{isEnglish ? 'Collected: ' : '采集日期：'}}{{sample.collectionDate}} · {{isEnglish ? 'Reliability: ' : '参考程度：'}}{{sample.referenceLevel}}</view><view class=\"sample-meta\">{{isEnglish ? sample.fxDescriptionEnglish : sample.fxDescription}}</view><view class=\"sample-meta\">{{sample.cloudMergeNote}}</view><view class=\"sample-reason\">{{isEnglish ? sample.reasonEnglish : sample.reason}}</view></view>\n    <view class=\"footer\">{{isEnglish ? 'Prices are shown in the selected currency. Listings may use other currencies; see data notes for exchange rates and collection dates. Fares change. For travel planning only.' : '页面价格按所选币种展示，来源标价可能使用其他币种；换算参考汇率与采集日见数据说明。价格会变化，分析仅作旅行决策参考。'}}</view>\n  </block>\n</view>\r\n"}};