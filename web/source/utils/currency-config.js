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
