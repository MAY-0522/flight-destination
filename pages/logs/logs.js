// logs.js
const util = require('../../utils/util.js')
const shareContent = require('../../utils/share-content.js')
const { getLanguage } = require('../../utils/language.js')

Page({
  data: {
    logs: []
  },
  onLoad() {
    this.setData({
      logs: (wx.getStorageSync('logs') || []).map(log => {
        return {
          date: util.formatTime(new Date(log)),
          timeStamp: log
        }
      })
    })
  },
  onShareAppMessage() {
    return shareContent.appMessage(
      getLanguage() === 'en' ? 'Explore flight fare trends from Kuala Lumpur' : '探索从吉隆坡出发的机票价格趋势',
      '/pages/index/index'
    )
  },
  onShareTimeline() {
    return shareContent.timeline(
      getLanguage() === 'en' ? 'Flight fare trends from Kuala Lumpur' : '吉隆坡出发机票价格趋势',
      {}
    )
  }
})
