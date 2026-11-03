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
