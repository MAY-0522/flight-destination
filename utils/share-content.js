const { getLanguage } = require('./language.js')
const currency = require('./currency-config.js')

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
