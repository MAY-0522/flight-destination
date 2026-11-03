const flightApi =
  require('../../utils/flight-api.js')

const destinationConfig =
  require('../../utils/destination-config.js')
const shareContent = require('../../utils/share-content.js')
const { getLanguage } = require('../../utils/language.js')

// ========================================
// 目的地查询并发数
// ========================================
// 不要一次性请求全部目的地。
// 当前设置为 2，避免同时向 Worker / SerpApi 发起过多请求。
const MAX_DESTINATION_CONCURRENCY = 2


Page({

  onShareAppMessage() {
    return shareContent.appMessage(
      getLanguage() === 'en' ? 'Discover destinations from Kuala Lumpur' : '探索吉隆坡出发的旅行目的地',
      '/pages/index/index'
    )
  },
  onShareTimeline() {
    return shareContent.timeline(
      getLanguage() === 'en' ? 'Discover destinations from Kuala Lumpur' : '发现吉隆坡出发的旅行目的地',
      {}
    )
  },

  data: {
    status: 'SEARCHING',

    progress: 0,

    currentStep:
      '正在为你寻找合适的目的地...',

    taskId: '',

    canCancel: true,

    successCount: 0,

    // 真正 API / 网络失败数量
    failedCount: 0,

    // 正常没有符合条件航班的目的地数量
    noResultCount: 0,

    totalCount: 0
  },


  // ========================================
  // 页面加载
  // ========================================
  onLoad() {

    console.log(
      '========== 真实航班搜索任务开始 =========='
    )

    const searchParams =
      wx.getStorageSync(
        'currentSearchParams'
      )

    // ----------------------------------------
    // 搜索参数不存在
    // ----------------------------------------

    if (!searchParams) {

      wx.showToast({
        title: '搜索参数不存在',
        icon: 'none'
      })

      setTimeout(() => {

        wx.navigateBack({
          delta: 1
        })

      }, 1000)

      return
    }

    // ----------------------------------------
    // 创建搜索任务
    // ----------------------------------------

    const taskId =
      this.createTaskId()

    const searchTask = {

      taskId,

      status: 'SEARCHING',

      createdAt: Date.now(),

      searchParams,

      results: [],

      failedDestinations: [],

      noResultDestinations: []
    }

    wx.setStorageSync(
      'currentSearchTask',
      searchTask
    )

    this.setData({
      taskId
    })

    console.log(
      '真实搜索任务创建成功:',
      searchTask
    )

    // ----------------------------------------
    // 开始 30 秒总计时
    // ----------------------------------------

    this.startTimeoutTimer(
      taskId
    )

    // ----------------------------------------
    // 开始真实航班搜索
    // ----------------------------------------

    this.startRealSearch(
      searchTask
    )
  },


  // ========================================
  // 创建任务 ID
  // ========================================
  createTaskId() {

    return (
      'search_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 8)
    )
  },


  // ========================================
  // 30 秒总超时
  // ========================================
  startTimeoutTimer(taskId) {

    this.timeoutTimer =
      setTimeout(() => {

        console.warn(
          '搜索任务超过 30 秒:',
          taskId
        )

        this.handleTimeout(
          taskId
        )

      }, 30000)
  },


  // ========================================
  // 开始真实航班搜索
  // ========================================
  startRealSearch(searchTask) {

    console.log(
      '开始查询真实航班...',
      searchTask.searchParams
    )

    this.setData({

      progress: 15,

      currentStep:
        '正在分析你的旅行条件...'
    })


    // ----------------------------------------
    // 从统一目的地配置获取目的地
    // ----------------------------------------

    const allDestinations =
      destinationConfig.getSoutheastAsiaDestinations()


    // ----------------------------------------
    // 根据用户排除条件过滤
    // ----------------------------------------

    const destinations =
      this.filterDestinations(
        allDestinations,
        searchTask.searchParams
      )


    console.log(
      '统一目的地配置:',
      allDestinations
    )

    console.log(
      '本次实际查询目的地:',
      destinations
    )


    this.setData({

      progress: 25,

      currentStep:
        `正在查询 ${destinations.length} 个目的地的公开网页报价...`,

      totalCount:
        destinations.length,

      successCount: 0,

      failedCount: 0,

      noResultCount: 0
    })


    // ----------------------------------------
    // 没有可查询目的地
    // ----------------------------------------

    if (
      destinations.length === 0
    ) {

      this.handleAllFailed(
        searchTask.taskId,
        []
      )

      return
    }


    // ----------------------------------------
    // 目的地级并发查询
    // ----------------------------------------
    //
    // 例如：
    //
    // 第 1 批：
    // SIN
    // BKK
    //
    // 完成一个后：
    // HKT
    //
    // 再完成一个：
    // CNX
    //
    // 始终最多同时查询 2 个目的地。
    //
    // 注意：
    // 每个目的地内部的 round-trip 日期查询
    // 由 flight-api.js 串行处理。
    // ----------------------------------------

    const responses = []

    let nextIndex = 0


    const runNext = async () => {

      while (true) {

        // ----------------------------------
        // 获取下一个任务
        // ----------------------------------

        const currentIndex =
          nextIndex++

        if (
          currentIndex >=
          destinations.length
        ) {

          return
        }


        // ----------------------------------
        // 当前搜索任务已经失效
        // ----------------------------------

        if (
          !this.checkSearchingTask(
            searchTask.taskId
          )
        ) {

          return
        }


        const destination =
          destinations[currentIndex]


        console.log(
          `开始查询目的地 ${currentIndex + 1}/${destinations.length}:`,
          destination.name,
          destination.code
        )


        try {

          // --------------------------------
          // 查询真实航班
          // --------------------------------

          const result =
            await flightApi.searchDestination(
              destination.code,
              searchTask.searchParams
            )


          // --------------------------------
          // 当前任务已经失效
          // --------------------------------

          if (
            !this.checkSearchingTask(
              searchTask.taskId
            )
          ) {

            return
          }


          // --------------------------------
          // NO_RESULTS
          // --------------------------------
          //
          // 这是正常情况：
          //
          // API 请求成功
          // 但指定日期范围内没有符合条件的直飞航班
          //
          // 不应该计入 failedCount。
          // --------------------------------

          if (
            result &&
            result.status === 'NO_RESULTS'
          ) {

            responses[currentIndex] = {

              success: false,

              status: 'NO_RESULTS',

              data: {

                ...result,

                destinationCode:
                  destination.code,

                destinationName:
                  destination.name,

                country:
                  destination.country,

                city:
                  destination.name
              }
            }

          }


          // --------------------------------
          // 找到航班
          // --------------------------------

          else if (
            result
          ) {

            responses[currentIndex] = {

              success: true,

              status: 'SUCCESS',

              data: {

                ...result,

                destinationCode:
                  destination.code,

                destinationName:
                  destination.name,

                country:
                  destination.country,

                city:
                  destination.name
              }
            }

          }


          // --------------------------------
          // 没有结果且 flight-api 没有返回明确状态
          // --------------------------------
          //
          // 为了兼容旧数据结构：
          // null / undefined 仍然视为 NO_RESULTS。
          //
          // 但新的 flight-api.js 正常情况下会明确返回
          // status: 'NO_RESULTS'。
          // --------------------------------

          else {

            responses[currentIndex] = {

              success: false,

              status: 'NO_RESULTS',

              data: {

                destinationCode:
                  destination.code,

                destinationName:
                  destination.name,

                country:
                  destination.country,

                city:
                  destination.name,

                departureDate:
                  searchTask.searchParams.departureDate,

                returnDate: null,

                duration: null
              }
            }
          }


        } catch (error) {

          // --------------------------------
          // 真正的 API / 网络异常
          // --------------------------------

          console.error(
            `${destination.name} 查询失败:`,
            error
          )


          responses[currentIndex] = {

            success: false,

            status: 'FAILED',

            error: {

              destination:
                destination.name,

              code:
                destination.code,

              message:
                this.getErrorMessage(
                  error
                )
            }
          }
        }


        // ----------------------------------
        // 更新查询进度
        // ----------------------------------

        const finishedCount =
          responses.filter(
            item => Boolean(item)
          ).length


        const successCount =
          responses.filter(
            item =>
              item &&
              item.success
          ).length


        const noResultCount =
          responses.filter(
            item =>
              item &&
              item.status === 'NO_RESULTS'
          ).length


        const failedCount =
          responses.filter(
            item =>
              item &&
              item.status === 'FAILED'
          ).length


        const progress =
          25 +
          Math.floor(
            (
              finishedCount /
              destinations.length
            ) * 55
          )


        if (
          this.checkSearchingTask(
            searchTask.taskId
          )
        ) {

          this.setData({

            progress,

            currentStep:
              `已查询 ${finishedCount}/${destinations.length} 个目的地...`,

            successCount,

            failedCount,

            noResultCount
          })
        }
      }
    }


    // ----------------------------------------
    // 创建 Worker
    // ----------------------------------------

    const workers = []

    const workerCount =
      Math.min(
        MAX_DESTINATION_CONCURRENCY,
        destinations.length
      )


    for (
      let i = 0;
      i < workerCount;
      i++
    ) {

      workers.push(
        runNext()
      )
    }


    // ----------------------------------------
    // 等待所有目的地查询完成
    // ----------------------------------------

    Promise.all(workers)

      .then(() => {

        // ----------------------------------
        // 搜索任务已经失效
        // ----------------------------------

        if (
          !this.checkSearchingTask(
            searchTask.taskId
          )
        ) {

          return
        }


        const finalResponses =
          responses.filter(
            item => Boolean(item)
          )


        console.log(
          '真实航班查询完成:',
          finalResponses
        )


        // ----------------------------------
        // 处理搜索结果
        // ----------------------------------

        this.processSearchResults(
          searchTask.taskId,
          finalResponses
        )
      })

      .catch(error => {

        console.error(
          '真实航班搜索异常:',
          error
        )


        if (
          !this.checkSearchingTask(
            searchTask.taskId
          )
        ) {

          return
        }


        this.handleAllFailed(
          searchTask.taskId,
          []
        )
      })
  },


  // ========================================
  // 根据排除条件过滤目的地
  // ========================================
  filterDestinations(
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

        // ----------------------------------
        // 国家级排除
        // ----------------------------------

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


        // ----------------------------------
        // 城市级排除
        // ----------------------------------

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
  },


  // ========================================
  // 错误信息统一处理
  // ========================================
  getErrorMessage(error) {

    if (!error) {

      return '未知错误'
    }


    if (
      error.type ===
      'NETWORK_ERROR'
    ) {

      return '网络连接失败'
    }


    if (
      error.type ===
      'API_ERROR'
    ) {

      if (
        error.statusCode === 429
      ) {

        return '航班数据请求过于频繁'
      }


      if (
        error.statusCode === 502
      ) {

        return '航班数据服务暂时不可用'
      }


      if (
        error.statusCode === 404
      ) {

        return '航班数据接口不存在'
      }


      return '航班数据服务异常'
    }


    if (
      error.message
    ) {

      return error.message
    }


    return '暂时无法获取航班数据'
  },


  // ========================================
  // 处理搜索结果
  // ========================================
  processSearchResults(
    taskId,
    responses
  ) {

    // ----------------------------------------
    // 成功找到航班
    // ----------------------------------------

    const successfulResults =
      responses
        .filter(
          item =>
            item &&
            item.success &&
            item.status === 'SUCCESS'
        )
        .map(
          item =>
            item.data
        )


    // ----------------------------------------
    // 正常无结果
    // ----------------------------------------

    const noResultResponses =
      responses.filter(
        item =>
          item &&
          item.status === 'NO_RESULTS'
      )


    // ----------------------------------------
    // 真正失败
    // ----------------------------------------

    const failedResults =
      responses.filter(
        item =>
          item &&
          item.status === 'FAILED'
      )


    const total =
      responses.length


    const successCount =
      successfulResults.length


    const noResultCount =
      noResultResponses.length


    const failedCount =
      failedResults.length


    console.log(
      '真实搜索完成:',
      {
        total,
        successCount,
        noResultCount,
        failedCount,
        successfulResults,
        noResultResponses,
        failedResults
      }
    )


    this.setData({

      progress: 90,

      currentStep:
        '正在整理真实航班结果...',

      successCount,

      noResultCount,

      failedCount,

      totalCount:
        total
    })


    // ====================================
    // 全部真正失败
    // ====================================
    //
    // 注意：
    // 如果全部都是 NO_RESULTS，
    // 不能进入这里。
    // ====================================

    if (
      successCount === 0 &&
      noResultCount === 0 &&
      failedCount > 0
    ) {

      this.handleAllFailed(
        taskId,
        failedResults
      )

      return
    }


    // ====================================
    // 没有任何响应
    // ====================================

    if (
      total === 0
    ) {

      this.handleAllFailed(
        taskId,
        []
      )

      return
    }


    // ====================================
    // 有结果 + 有真正失败
    // ====================================

    if (
      successCount > 0 &&
      failedCount > 0
    ) {

      this.handlePartialSuccess(
        taskId,
        successfulResults,
        failedResults
      )

      return
    }


    // ====================================
    // 有结果，但没有真正失败
    // ====================================
    //
    // 包括：
    //
    // 6 个成功
    // 7 个 NO_RESULTS
    //
    // 这种情况属于正常 SUCCESS。
    // ====================================

    this.handleSuccess(
      taskId,
      successfulResults,
      noResultResponses
    )
  },


  // ========================================
  // 全部成功 / 正常完成
  // ========================================
  handleSuccess(
    taskId,
    results,
    noResultResponses = []
  ) {

    if (
      !this.checkSearchingTask(
        taskId
      )
    ) {

      return
    }


    this.clearTimeoutTimer()


    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      !currentTask ||
      currentTask.taskId !==
        taskId
    ) {

      return
    }


    currentTask.status =
      'SUCCESS'


    currentTask.results =
      results


    currentTask.failedDestinations =
      []


    currentTask.noResultDestinations =
      noResultResponses.map(
        item => {

          return {

            destination:
              item.data &&
              item.data.destinationName
                ? item.data.destinationName
                : '',

            code:
              item.data &&
              item.data.destinationCode
                ? item.data.destinationCode
                : ''
          }
        }
      )


    currentTask.completedAt =
      Date.now()


    wx.setStorageSync(
      'currentSearchTask',
      currentTask
    )


    this.setData({

      status:
        'SUCCESS',

      progress:
        100,

      currentStep:
        results.length > 0
          ? '真实航班搜索完成，正在整理结果...'
          : '暂时没有找到符合条件的目的地',

      canCancel:
        false
    })


    console.log(
      '真实航班搜索正常完成:',
      currentTask
    )


    this.finishTimer =
      setTimeout(() => {

        this.goToResults(
          taskId
        )

      }, 500)
  },


  // ========================================
  // 部分成功
  // ========================================
  handlePartialSuccess(
    taskId,
    results,
    failedResults
  ) {

    if (
      !this.checkSearchingTask(
        taskId
      )
    ) {

      return
    }


    this.clearTimeoutTimer()


    const failedDestinations =
      failedResults.map(
        item => ({

          destination:
            item.error &&
            item.error.destination
              ? item.error.destination
              : '未知目的地',

          code:
            item.error &&
            item.error.code
              ? item.error.code
              : '',

          message:
            item.error &&
            item.error.message
              ? item.error.message
              : '暂时无法获取航班数据'
        })
      )


    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      !currentTask ||
      currentTask.taskId !==
        taskId
    ) {

      return
    }


    currentTask.status =
      'PARTIAL_SUCCESS'


    currentTask.results =
      results


    currentTask.failedDestinations =
      failedDestinations


    currentTask.noResultDestinations =
      []


    currentTask.completedAt =
      Date.now()


    wx.setStorageSync(
      'currentSearchTask',
      currentTask
    )


    this.setData({

      status:
        'PARTIAL_SUCCESS',

      progress:
        100,

      currentStep:
        `已找到 ${results.length} 个真实目的地，部分数据暂时无法获取`,

      canCancel:
        false
    })


    console.log(
      '真实航班部分成功:',
      currentTask
    )


    this.finishTimer =
      setTimeout(() => {

        this.goToResults(
          taskId
        )

      }, 1000)
  },


  // ========================================
  // 全部失败
  // ========================================
  handleAllFailed(
    taskId,
    failedResults
  ) {

    this.clearTimeoutTimer()


    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      !currentTask ||
      currentTask.taskId !==
        taskId
    ) {

      return
    }


    const failedDestinations =
      Array.isArray(
        failedResults
      )
        ? failedResults.map(
            item => ({

              destination:
                item.error &&
                item.error.destination
                  ? item.error.destination
                  : '未知目的地',

              code:
                item.error &&
                item.error.code
                  ? item.error.code
                  : '',

              message:
                item.error &&
                item.error.message
                  ? item.error.message
                  : '暂时无法获取航班数据'
            })
          )
        : []


    currentTask.status =
      'ALL_FAILED'


    currentTask.results =
      []


    currentTask.failedDestinations =
      failedDestinations


    currentTask.noResultDestinations =
      []


    currentTask.completedAt =
      Date.now()


    wx.setStorageSync(
      'currentSearchTask',
      currentTask
    )


    this.setData({

      status:
        'ALL_FAILED',

      progress:
        100,

      currentStep:
        '暂时无法获取真实机票数据',

      canCancel:
        false
    })


    console.warn(
      '全部目的地真实航班查询失败'
    )


    wx.showModal({

      title:
        '暂时无法获取数据',

      content:
        '本次搜索没有成功获取任何目的地的真实机票价格，请重新尝试。',

      confirmText:
        '重新搜索',

      cancelText:
        '修改条件',

      success: res => {

        if (
          res.confirm
        ) {

          this.retrySearch()

        } else {

          wx.navigateBack({
            delta: 1
          })
        }
      }
    })
  },


  // ========================================
  // 检查搜索任务是否仍然有效
  // ========================================
  checkSearchingTask(
    taskId
  ) {

    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      !currentTask
    ) {

      return false
    }


    if (
      currentTask.taskId !==
      taskId
    ) {

      return false
    }


    if (
      currentTask.status !==
      'SEARCHING'
    ) {

      return false
    }


    if (
      this.data.taskId !==
      taskId
    ) {

      return false
    }


    return true
  },


  // ========================================
  // 超时
  // ========================================
  handleTimeout(
    taskId
  ) {

    if (
      !this.checkSearchingTask(
        taskId
      )
    ) {

      return
    }


    this.clearSearchTimers()


    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      currentTask &&
      currentTask.taskId ===
        taskId
    ) {

      currentTask.status =
        'TIMEOUT'


      currentTask.timeoutAt =
        Date.now()


      wx.setStorageSync(
        'currentSearchTask',
        currentTask
      )
    }


    this.setData({

      status:
        'TIMEOUT',

      canCancel:
        false,

      currentStep:
        '搜索时间过长，请重新尝试'
    })


    wx.showModal({

      title:
        '搜索超时',

      content:
        '本次真实航班搜索超过30秒仍未完成，你可以重新尝试。',

      confirmText:
        '重新搜索',

      cancelText:
        '返回修改',

      success: res => {

        if (
          res.confirm
        ) {

          this.retrySearch()

        } else {

          wx.navigateBack({
            delta: 1
          })
        }
      }
    })
  },


  // ========================================
  // 重试
  // ========================================
  retrySearch() {

    console.log(
      '重新创建真实航班搜索任务'
    )


    const searchParams =
      wx.getStorageSync(
        'currentSearchParams'
      )


    if (
      !searchParams
    ) {

      wx.navigateBack({
        delta: 1
      })

      return
    }


    const taskId =
      this.createTaskId()


    const searchTask = {

      taskId,

      status:
        'SEARCHING',

      createdAt:
        Date.now(),

      searchParams,

      results:
        [],

      failedDestinations:
        [],

      noResultDestinations:
        []
    }


    wx.setStorageSync(
      'currentSearchTask',
      searchTask
    )


    this.setData({

      status:
        'SEARCHING',

      progress:
        0,

      currentStep:
        '正在重新获取真实航班数据...',

      taskId,

      canCancel:
        true,

      successCount:
        0,

      failedCount:
        0,

      noResultCount:
        0,

      totalCount:
        0
    })


    this.startTimeoutTimer(
      taskId
    )


    this.startRealSearch(
      searchTask
    )
  },


  // ========================================
  // 进入结果页
  // ========================================
  goToResults(
    taskId
  ) {

    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      !currentTask ||
      currentTask.taskId !==
        taskId
    ) {

      return
    }


    if (
      currentTask.status !==
        'SUCCESS' &&
      currentTask.status !==
        'PARTIAL_SUCCESS'
    ) {

      return
    }


    wx.redirectTo({

      url:
        '/pages/results/results',

      fail: err => {

        console.error(
          '进入结果页失败:',
          err
        )


        wx.showToast({

          title:
            '结果页面打开失败',

          icon:
            'none'
        })
      }
    })
  },


  // ========================================
  // 取消搜索
  // ========================================
  cancelSearch() {

    if (
      this.data.status !==
      'SEARCHING'
    ) {

      return
    }


    console.log(
      '用户取消真实航班搜索:',
      this.data.taskId
    )


    this.clearSearchTimers()

    this.clearTimeoutTimer()


    const currentTask =
      wx.getStorageSync(
        'currentSearchTask'
      )


    if (
      currentTask &&
      currentTask.taskId ===
        this.data.taskId
    ) {

      currentTask.status =
        'CANCELLED'


      currentTask.cancelledAt =
        Date.now()


      wx.setStorageSync(
        'currentSearchTask',
        currentTask
      )
    }


    this.setData({

      status:
        'CANCELLED',

      canCancel:
        false,

      currentStep:
        '已取消搜索'
    })


    setTimeout(() => {

      wx.navigateBack({
        delta: 1
      })

    }, 300)
  },


  // ========================================
  // 清除定时器
  // ========================================
  clearSearchTimers() {

    if (
      this.timer1
    ) {

      clearTimeout(
        this.timer1
      )

      this.timer1 =
        null
    }


    if (
      this.timer2
    ) {

      clearTimeout(
        this.timer2
      )

      this.timer2 =
        null
    }


    if (
      this.timer3
    ) {

      clearTimeout(
        this.timer3
      )

      this.timer3 =
        null
    }


    if (
      this.timer4
    ) {

      clearTimeout(
        this.timer4
      )

      this.timer4 =
        null
    }


    if (
      this.finishTimer
    ) {

      clearTimeout(
        this.finishTimer
      )

      this.finishTimer =
        null
    }
  },


  // ========================================
  // 清除超时计时器
  // ========================================
  clearTimeoutTimer() {

    if (
      this.timeoutTimer
    ) {

      clearTimeout(
        this.timeoutTimer
      )

      this.timeoutTimer =
        null
    }
  },


  // ========================================
  // 页面卸载
  // ========================================
  onUnload() {

    console.log(
      '真实航班搜索 Loading 页面卸载'
    )


    this.clearSearchTimers()

    this.clearTimeoutTimer()
  }

})
