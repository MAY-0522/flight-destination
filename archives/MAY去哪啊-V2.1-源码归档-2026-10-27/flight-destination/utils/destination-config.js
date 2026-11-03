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
