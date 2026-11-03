// pages/results/results.js

const flightApi = require('../../utils/flight-api.js');
const shareContent = require('../../utils/share-content.js');
const { getLanguage } = require('../../utils/language.js');

const CACHE_DURATION = 15 * 60 * 1000; // 15分钟
const REFRESH_TIMEOUT = 30 * 1000;     // 30秒
const REFRESH_CONCURRENCY = 1;         // V1.0：刷新时逐个查询，降低 API 压力


// ============================================================
// V1.0：构建搜索条件唯一标识
// 防止不同搜索条件之间误用旧价格缓存
// ============================================================

function buildSearchKey(searchParams) {
  if (!searchParams) {
    return '';
  }

  const origin =
    searchParams.origin &&
    searchParams.origin.airport
      ? searchParams.origin.airport
      : 'KUL';

  const departureDate =
    searchParams.departureDate || '';

  const tripType =
    searchParams.tripType || '';

  const minDuration =
    tripType === 'round'
      ? Number(searchParams.minDuration || 0)
      : 0;

  const maxDuration =
    tripType === 'round'
      ? Number(searchParams.maxDuration || 0)
      : 0;

  const budgetSet =
    searchParams.budgetSet ? '1' : '0';

  const unlimitedBudget =
    searchParams.unlimitedBudget ? '1' : '0';

  const budget =
    searchParams.budgetSet &&
    !searchParams.unlimitedBudget
      ? Number(searchParams.budget || 0)
      : 0;

  const excluded =
    Array.isArray(searchParams.excludedDestinations)
      ? searchParams.excludedDestinations
          .map(item => {
            if (!item) {
              return '';
            }

            if (typeof item === 'string') {
              return item;
            }

            return `${item.type || ''}:${item.name || ''}`;
          })
          .filter(Boolean)
          .sort()
      : [];

  return [
    origin,
    departureDate,
    tripType,
    `${minDuration}-${maxDuration}`,
    `${budgetSet}-${unlimitedBudget}-${budget}`,
    excluded.join(',')
  ].join('|');
}


// ============================================================
// 页面
// ============================================================

Page({

  onShareAppMessage() {
    return shareContent.appMessage(
      getLanguage() === 'en' ? 'Explore flight fare trends from Kuala Lumpur' : '看看吉隆坡出发的航线价格分析',
      '/pages/index/index'
    );
  },
  onShareTimeline() {
    return shareContent.timeline(
      getLanguage() === 'en' ? 'Explore flight fare trends from Kuala Lumpur' : '吉隆坡出发的航线价格分析',
      {}
    );
  },

  // ==========================================================
  // 数据
  // ==========================================================

  data: {

    // 页面是否处于加载/刷新锁定状态
    loading: false,

    // 当前搜索任务状态
    taskStatus: 'SUCCESS',

    // 刷新状态
    refreshStatus: 'IDLE',

    // 刷新错误信息
    refreshErrorMessage: '',

    // 搜索失败目的地
    failedDestinations: [],

    // 刷新失败目的地
    refreshFailedDestinations: [],

    // ========================================================
    // 价格新鲜度
    // ========================================================

    priceStatus: 'FRESH',

    isStale: false,

    lastUpdatedAt: '',

    // ========================================================
    // 当前搜索参数
    // ========================================================

    searchSummary: {},

    // ========================================================
    // 所有真实结果
    // ========================================================

    allResults: [],

    // 当前经过筛选后的结果
    results: [],

    // ========================================================
    // 国家映射
    // ========================================================

    countryMap: {

      新加坡: '新加坡',

      泰国: '泰国',
      曼谷: '泰国',
      普吉岛: '泰国',
      清迈: '泰国',

      马来西亚: '马来西亚',
      槟城: '马来西亚',

      印度尼西亚: '印度尼西亚',
      巴厘岛: '印度尼西亚',
      雅加达: '印度尼西亚',

      越南: '越南',
      胡志明市: '越南',
      河内: '越南',

      菲律宾: '菲律宾',
      马尼拉: '菲律宾',
      宿务: '菲律宾',

      柬埔寨: '柬埔寨',
      金边: '柬埔寨',
      暹粒: '柬埔寨'
    },

    // ========================================================
    // 城市映射
    // ========================================================

    cityMap: {

      新加坡: '新加坡',

      曼谷: '曼谷',
      普吉岛: '普吉岛',
      清迈: '清迈',

      槟城: '槟城',

      巴厘岛: '巴厘岛',
      雅加达: '雅加达',

      胡志明市: '胡志明市',
      河内: '河内',

      马尼拉: '马尼拉',
      宿务: '宿务',

      金边: '金边',
      暹粒: '暹粒'
    }
  },


  // ==========================================================
  // 页面加载
  // ==========================================================

  onLoad() {

    console.log('========== 结果页加载 ==========');

    const searchParams =
      wx.getStorageSync('currentSearchParams') || {};

    const currentTask =
      wx.getStorageSync('currentSearchTask') || {};

    console.log(
      '搜索参数:',
      searchParams
    );

    console.log(
      '当前搜索任务:',
      currentTask
    );

    // --------------------------------------------------------
    // 设置基本状态
    // --------------------------------------------------------

    this.setData({

      searchSummary: searchParams,

      taskStatus:
        currentTask.status || 'SUCCESS',

      failedDestinations:
        currentTask.failedDestinations || []
    });


    // --------------------------------------------------------
    // 当前搜索任务是真实结果
    // 优先级最高
    // --------------------------------------------------------

    if (
      Array.isArray(currentTask.results) &&
      currentTask.results.length > 0
    ) {

      console.log(
        '检测到当前搜索任务真实结果:',
        currentTask.results
      );

      const normalizedResults =
        this.normalizeResults(
          currentTask.results
        );

      this.setData({
        allResults: normalizedResults
      });

      const now = Date.now();

      // 当前搜索结果建立缓存
      wx.setStorageSync(
        'priceCache',
        {
          results: normalizedResults,
          updatedAt: now,
          searchKey:
            buildSearchKey(searchParams)
        }
      );

      this.updatePriceFreshness(now);

      this.applyFilters();

      console.log(
        '本次真实搜索结果已加载到结果页:',
        normalizedResults
      );

      return;
    }


    // --------------------------------------------------------
    // 当前任务没有结果
    // 尝试读取与当前搜索条件匹配的缓存
    // --------------------------------------------------------

    const cachedPriceData =
      wx.getStorageSync('priceCache');

    const currentSearchKey =
      buildSearchKey(searchParams);

    const isCacheValidForCurrentSearch =
      cachedPriceData &&
      Array.isArray(cachedPriceData.results) &&
      cachedPriceData.searchKey === currentSearchKey;


    if (isCacheValidForCurrentSearch) {

      console.log(
        '使用当前搜索条件对应的价格缓存:',
        cachedPriceData
      );

      const cachedResults =
        this.normalizeResults(
          cachedPriceData.results
        );

      this.setData({
        allResults: cachedResults
      });

      this.updatePriceFreshness(
        cachedPriceData.updatedAt
      );

      this.applyFilters();

      return;
    }


    // --------------------------------------------------------
    // 没有匹配缓存
    // V1.0 不再使用 Mock 数据
    // --------------------------------------------------------

    console.warn(
      '当前搜索没有真实结果，也没有匹配的价格缓存。'
    );

    this.setData({
      allResults: [],
      results: [],
      priceStatus: 'STALE',
      isStale: true,
      lastUpdatedAt: ''
    });

    this.applyFilters();
  },


  // ==========================================================
  // 标准化真实航班结果
  // ==========================================================

  normalizeResults(results) {

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .filter(item => item)
      .map(item => {

        return {

          ...item,

          destination:
            item.destination ||
            item.destinationName ||
            '',

          destinationName:
            item.destinationName ||
            item.destination ||
            '',

          destinationCode:
            item.destinationCode ||
            item.airport ||
            '',

          country:
            item.country ||
            '',

          city:
            item.city ||
            item.destinationName ||
            item.destination ||
            '',

          airport:
            item.airport ||
            item.destinationCode ||
            '',

          price:
            Number(item.price || 0),

          duration:
            item.duration != null
              ? Number(item.duration)
              : null,

          airline:
            item.airline ||
            '未知航空',

          airlineLogo:
            item.airlineLogo ||
            '',

          totalDuration:
            item.totalDuration != null
              ? Number(item.totalDuration)
              : null,

          stops:
            item.stops != null
              ? Number(item.stops)
              : 0,

          departure:
            item.departure || null,

          arrival:
            item.arrival || null,

          returnDeparture:
            item.returnDeparture || null,

          returnArrival:
            item.returnArrival || null,

          segments:
            Array.isArray(item.segments)
              ? item.segments
              : []
        };
      })
      .filter(item => {

        // V1.0 不允许价格为 0 的异常数据进入结果
        return item.price > 0;
      });
  },


  // ==========================================================
  // 判断价格是否超过15分钟
  // ==========================================================

  updatePriceFreshness(updatedAt) {

    if (!updatedAt) {

      this.setData({

        priceStatus: 'STALE',

        isStale: true,

        lastUpdatedAt: ''
      });

      return;
    }

    const now = Date.now();

    const age =
      now - updatedAt;

    const stale =
      age > CACHE_DURATION;

    this.setData({

      priceStatus:
        stale
          ? 'STALE'
          : 'FRESH',

      isStale:
        stale,

      lastUpdatedAt:
        this.formatTime(updatedAt)
    });
  },


  // ==========================================================
  // 每次进入页面检查价格状态
  // ==========================================================

  checkPriceFreshness() {

    const cache =
      wx.getStorageSync('priceCache');

    if (
      !cache ||
      !cache.updatedAt
    ) {

      this.updatePriceFreshness(null);

      return;
    }

    this.updatePriceFreshness(
      cache.updatedAt
    );
  },


  // ==========================================================
  // 应用筛选
  // ==========================================================

  applyFilters() {

    const params =
      this.data.searchSummary || {};

    let filtered =
      [...this.data.allResults];


    // --------------------------------------------------------
    // 预算过滤
    // --------------------------------------------------------

    if (
      params.budgetSet &&
      !params.unlimitedBudget
    ) {

      const budget =
        Number(params.budget || 0);

      filtered =
        filtered.filter(item => {

          return (
            Number(item.price || 0)
            <= budget
          );
        });
    }


    // --------------------------------------------------------
    // 往返天数过滤
    // --------------------------------------------------------

    if (
      params.tripType === 'round'
    ) {

      const minDuration =
        Number(params.minDuration || 0);

      const maxDuration =
        Number(params.maxDuration || 0);

      filtered =
        filtered.filter(item => {

          const duration =
            Number(item.duration || 0);

          return (
            duration >= minDuration &&
            duration <= maxDuration
          );
        });
    }


    // --------------------------------------------------------
    // 排除目的地
    // --------------------------------------------------------

    const excluded =
      Array.isArray(params.excludedDestinations)
        ? params.excludedDestinations
        : [];


    if (excluded.length > 0) {

      filtered =
        filtered.filter(item => {

          const country =
            this.data.countryMap[
              item.destination
            ] ||
            item.country ||
            '';

          const city =
            this.data.cityMap[
              item.destination
            ] ||
            item.city ||
            item.destination ||
            '';


          return !excluded.some(
            excludedItem => {

              if (!excludedItem) {
                return false;
              }

              // 国家排除
              if (
                excludedItem.type ===
                'country'
              ) {

                return (
                  country !==
                  excludedItem.name
                );
              }

              // 城市排除
              if (
                excludedItem.type ===
                'city'
              ) {

                return (
                  city !==
                  excludedItem.name
                );
              }

              return true;
            }
          );
        });
    }


    // --------------------------------------------------------
    // 价格升序
    // --------------------------------------------------------

    filtered.sort(
      (a, b) => {

        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );
      }
    );


    this.setData({
      results: filtered
    });


    console.log(
      '筛选后的结果:',
      filtered
    );
  },


  // ==========================================================
  // 修改搜索条件
  // ==========================================================

  modifySearch() {

    if (this.data.loading) {
      return;
    }

    wx.navigateBack({
      delta: 1
    });
  },


  // ==========================================================
  // 手动刷新价格
  // ==========================================================

  refreshResults() {

    // 防止重复点击
    if (
      this.data.refreshStatus ===
      'REFRESHING'
    ) {

      return;
    }


    const searchParams =
      this.data.searchSummary || {};


    if (
      !searchParams.departureDate
    ) {

      wx.showToast({

        title:
          '搜索条件不存在',

        icon:
          'none'
      });

      return;
    }


    // --------------------------------------------------------
    // 开始刷新
    // --------------------------------------------------------

    this.setData({

      loading: true,

      refreshStatus:
        'REFRESHING',

      refreshErrorMessage:
        '',

      refreshFailedDestinations:
        []
    });


    wx.showLoading({

      title:
        '正在更新价格...',

      mask:
        true
    });


    // --------------------------------------------------------
    // 30秒超时
    // --------------------------------------------------------

    this.clearRefreshTimers();

    this.refreshTimeoutTimer =
      setTimeout(() => {

        this.handleRefreshTimeout();

      }, REFRESH_TIMEOUT);


    // --------------------------------------------------------
    // 开始真实刷新
    // --------------------------------------------------------

    this.startRealRefresh(
      searchParams
    );
  },


  // ==========================================================
  // 真实价格刷新
  // ==========================================================

  async startRealRefresh(searchParams) {

    const requestId =
      `refresh_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    this.currentRefreshRequestId =
      requestId;


    const destinations =
      [...this.data.allResults];


    console.log(
      '========== 开始真实价格刷新 ==========',
      requestId
    );

    console.log(
      '待刷新目的地:',
      destinations
    );


    if (
      destinations.length === 0
    ) {

      this.handleRefreshAllFailed();

      return;
    }


    const successfulResults = [];

    const failedResults = [];


    // --------------------------------------------------------
    // V1.0：逐个查询
    // 降低 API 并发压力
    // --------------------------------------------------------

    for (
      let i = 0;
      i < destinations.length;
      i++
    ) {

      // 如果请求已经失效
      if (
        this.currentRefreshRequestId !==
        requestId
      ) {

        return;
      }


      // 如果已经超时
      if (
        this.data.refreshStatus !==
        'REFRESHING'
      ) {

        return;
      }


      const destination =
        destinations[i];


      const destinationCode =
        destination.destinationCode ||
        destination.airport;


      console.log(
        `开始刷新 ${i + 1}/${destinations.length}:`,
        destination.destination,
        destinationCode
      );


      try {

        const result =
          await flightApi.searchDestination(
            destinationCode,
            searchParams
          );


        // 请求完成后再次确认 requestId
        if (
          this.currentRefreshRequestId !==
          requestId
        ) {

          return;
        }


        if (!result) {

          failedResults.push({
            ...destination,
            error: {
              destination:
                destination.destination,
              code:
                destinationCode,
              message:
                '该日期范围内没有找到符合条件的直飞航班'
            }
          });

        } else {

          successfulResults.push({

            ...destination,

            ...result,

            destinationCode:
              destinationCode,

            destinationName:
              destination.destinationName ||
              destination.destination,

            country:
              destination.country,

            city:
              destination.city ||
              destination.destination,

            airport:
              destinationCode
          });
        }


      } catch (error) {

        console.error(
          `[flight-api] ${destination.destination} 刷新失败`,
          error
        );


        failedResults.push({

          ...destination,

          error: {

            destination:
              destination.destination,

            code:
              destinationCode,

            message:
              this.getErrorMessage(
                error
              )
          }
        });
      }


      // ------------------------------------------------------
      // 更新刷新进度
      // ------------------------------------------------------

      const finishedCount =
        successfulResults.length +
        failedResults.length;


      console.log(
        '刷新进度:',
        {
          finishedCount,
          successCount:
            successfulResults.length,
          failedCount:
            failedResults.length
        }
      );
    }


    // --------------------------------------------------------
    // 防止旧刷新覆盖新刷新
    // --------------------------------------------------------

    if (
      this.currentRefreshRequestId !==
      requestId
    ) {

      return;
    }


    console.log(
      '真实刷新完成:',
      {
        total:
          destinations.length,

        successCount:
          successfulResults.length,

        failedCount:
          failedResults.length,

        successfulResults,

        failedResults
      }
    );


    // --------------------------------------------------------
    // 全部失败
    // --------------------------------------------------------

    if (
      successfulResults.length === 0
    ) {

      this.handleRefreshAllFailed();

      return;
    }


    // --------------------------------------------------------
    // 部分成功
    // --------------------------------------------------------

    if (
      failedResults.length > 0
    ) {

      this.handleRefreshPartialSuccess(
        successfulResults,
        failedResults
      );

      return;
    }


    // --------------------------------------------------------
    // 全部成功
    // --------------------------------------------------------

    this.handleRefreshSuccess(
      successfulResults
    );
  },


  // ==========================================================
  // 刷新全部成功
  // ==========================================================

  handleRefreshSuccess(
    newResults
  ) {

    this.clearRefreshTimers();

    const now =
      Date.now();


    const normalizedResults =
      this.normalizeResults(
        newResults
      );


    // --------------------------------------------------------
    // 整体替换
    // --------------------------------------------------------

    this.setData({

      allResults:
        normalizedResults,

      loading:
        false,

      refreshStatus:
        'SUCCESS',

      refreshErrorMessage:
        '',

      refreshFailedDestinations:
        [],

      lastUpdatedAt:
        this.formatTime(now),

      priceStatus:
        'FRESH',

      isStale:
        false
    });


    // --------------------------------------------------------
    // 写入缓存
    // --------------------------------------------------------

    wx.setStorageSync(
      'priceCache',
      {

        results:
          normalizedResults,

        updatedAt:
          now,

        searchKey:
          buildSearchKey(
            this.data.searchSummary
          )
      }
    );


    // --------------------------------------------------------
    // 重新筛选
    // --------------------------------------------------------

    this.applyFilters();


    wx.hideLoading();


    wx.showToast({

      title:
        '价格已更新',

      icon:
        'success'
    });


    console.log(
      '真实刷新全部成功:',
      normalizedResults
    );
  },


  // ==========================================================
  // 刷新部分成功
  //
  // V1.0：
  // 只显示本次成功获取的新结果
  // 不拿旧缓存补失败目的地
  // ==========================================================

  handleRefreshPartialSuccess(
    successfulResults,
    failedResults
  ) {

    this.clearRefreshTimers();


    const normalizedResults =
      this.normalizeResults(
        successfulResults
      );


    const now =
      Date.now();


    const failedNames =
      failedResults.map(
        item =>
          item.destination ||
          item.destinationName
      );


    // --------------------------------------------------------
    // 注意：
    //
    // 部分刷新成功时：
    // 只保留本次成功获取的结果。
    //
    // 不把失败目的地旧价格重新塞回来。
    // --------------------------------------------------------

    this.setData({

      allResults:
        normalizedResults,

      loading:
        false,

      refreshStatus:
        'PARTIAL_SUCCESS',

      refreshErrorMessage:
        '部分目的地价格更新失败，已更新成功的目的地显示最新价格。',

      refreshFailedDestinations:
        failedNames
    });


    // --------------------------------------------------------
    // 缓存也只保存成功结果
    // 时间使用原来的成功时间
    // --------------------------------------------------------

    const oldCache =
      wx.getStorageSync(
        'priceCache'
      ) || {};


    const oldUpdatedAt =
      oldCache.updatedAt ||
      now;


    wx.setStorageSync(
      'priceCache',
      {

        results:
          normalizedResults,

        updatedAt:
          oldUpdatedAt,

        searchKey:
          buildSearchKey(
            this.data.searchSummary
          )
      }
    );


    this.updatePriceFreshness(
      oldUpdatedAt
    );


    this.applyFilters();


    wx.hideLoading();


    console.warn(
      '真实刷新部分成功:',
      {
        success:
          normalizedResults,

        failed:
          failedResults
      }
    );
  },


  // ==========================================================
  // 刷新全部失败
  // ==========================================================

  handleRefreshAllFailed() {

    this.clearRefreshTimers();


    this.setData({

      loading:
        false,

      refreshStatus:
        'ALL_FAILED',

      refreshErrorMessage:
        '本次价格更新失败，当前仍显示上次成功获取的价格。'
    });


    // --------------------------------------------------------
    // 不修改旧价格
    // 不修改旧更新时间
    // --------------------------------------------------------

    this.checkPriceFreshness();


    wx.hideLoading();


    console.warn(
      '真实刷新全部失败'
    );
  },


  // ==========================================================
  // 刷新超时
  // ==========================================================

  handleRefreshTimeout() {

    this.clearRefreshTimers();


    // 使当前刷新请求失效
    this.currentRefreshRequestId =
      null;


    this.setData({

      loading:
        false,

      refreshStatus:
        'TIMEOUT',

      refreshErrorMessage:
        '价格更新超时，当前仍显示上次成功获取的价格。'
    });


    // --------------------------------------------------------
    // 超时：
    // 不修改结果
    // 不修改缓存
    // 不修改更新时间
    // --------------------------------------------------------

    this.checkPriceFreshness();


    wx.hideLoading();


    console.warn(
      '真实刷新超时'
    );
  },


  // ==========================================================
  // 重试刷新
  // ==========================================================

  retryRefresh() {

    if (
      this.data.refreshStatus ===
      'REFRESHING'
    ) {

      return;
    }


    this.refreshResults();
  },


  // ==========================================================
  // 获取错误信息
  // ==========================================================

  getErrorMessage(error) {

    if (!error) {

      return '未知错误';
    }


    if (
      error.type ===
      'NETWORK_ERROR'
    ) {

      return '网络连接失败';
    }


    if (
      error.type ===
      'API_ERROR'
    ) {

      if (
        error.data &&
        error.data.message
      ) {

        return error.data.message;
      }


      if (
        error.statusCode
      ) {

        return `接口错误（${error.statusCode}）`;
      }


      return '航班数据接口错误';
    }


    if (
      error.message
    ) {

      return error.message;
    }


    return '航班数据获取失败';
  },


  // ==========================================================
  // 清理刷新计时器
  // ==========================================================

  clearRefreshTimers() {

    if (
      this.refreshTimeoutTimer
    ) {

      clearTimeout(
        this.refreshTimeoutTimer
      );

      this.refreshTimeoutTimer =
        null;
    }
  },


  // ==========================================================
  // 格式化时间
  // ==========================================================

  formatTime(timestamp) {

    if (!timestamp) {

      return '';
    }


    const date =
      new Date(timestamp);


    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');


    const day =
      String(
        date.getDate()
      ).padStart(2, '0');


    const hour =
      String(
        date.getHours()
      ).padStart(2, '0');


    const minute =
      String(
        date.getMinutes()
      ).padStart(2, '0');


    return (
      `${year}-${month}-${day} ` +
      `${hour}:${minute}`
    );
  },


  // ==========================================================
  // 页面重新显示
  // ==========================================================

  onShow() {

    if (
      this.data.allResults.length > 0
    ) {

      this.checkPriceFreshness();
    }
  },


  // ==========================================================
  // 页面卸载
  // ==========================================================

  onUnload() {

    console.log(
      '结果页卸载'
    );


    this.clearRefreshTimers();


    // 让已经发出的旧刷新请求失效
    this.currentRefreshRequestId =
      null;
  }

});
