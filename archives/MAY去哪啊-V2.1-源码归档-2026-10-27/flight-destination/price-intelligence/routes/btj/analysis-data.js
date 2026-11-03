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
