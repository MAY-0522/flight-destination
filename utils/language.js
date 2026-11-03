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
