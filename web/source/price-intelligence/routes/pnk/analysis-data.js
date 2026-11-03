module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "PNK",
    "trip_type": "one_way",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.763Z",
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
    "minimum": 264,
    "p10": 285.2,
    "p25": 317,
    "median": 317,
    "p75": 317,
    "p90": 317,
    "maximum": 317
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Wednesday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Thursday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Friday": {
        "count": 1,
        "average": 317,
        "median": 317
      },
      "Saturday": {
        "count": 2,
        "average": 290.5,
        "median": 290.5
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Saturday",
    "highest_average_day": "Friday",
    "weekday_average": 317,
    "weekend_average": 290.5,
    "weekend_premium_percentage": -8.36,
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
        "count": 5,
        "average": 306.4,
        "median": 317
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
