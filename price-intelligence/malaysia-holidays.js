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
