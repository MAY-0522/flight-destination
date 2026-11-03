module.exports = {
  "route": {
    "origin": "KUL",
    "destination": "SUB",
    "trip_type": "round_trip",
    "currency": "MYR"
  },
  "generated_at": "2026-10-26T10:50:06.916Z",
  "sample": {
    "observation_count": 3,
    "distinct_departure_dates": 3,
    "distinct_itineraries": 3,
    "sources": [
      "Expedia Malaysia"
    ],
    "collection_dates": [
      "2026-10-26"
    ],
    "source_freshness_note": "round-trip样本来源：Expedia Malaysia。每条观察中的日期、标价与采集时间以对应来源页面记录为准；网页价格和可售性会变化，未逐条完成下单核验。 Expedia 页面称相关报价在过去 7 天内可查。",
    "reference_level": "较低",
    "reference_reason": "本次仅收集到 3 条往返公开标价，属于网页快照样本；样本范围有限，结论仅作参考。"
  },
  "price_distribution_raw_quotes": {
    "count": 3,
    "minimum": 620,
    "p10": 623.2,
    "p25": 628,
    "median": 636,
    "p75": 645.5,
    "p90": 651.2,
    "maximum": 655
  },
  "weekday_effect_by_departure_date_median": {
    "weekdays": {
      "Monday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Tuesday": {
        "count": 1,
        "average": 636,
        "median": 636
      },
      "Wednesday": {
        "count": 2,
        "average": 637.5,
        "median": 637.5
      },
      "Thursday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Friday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Saturday": {
        "count": 0,
        "average": null,
        "median": null
      },
      "Sunday": {
        "count": 0,
        "average": null,
        "median": null
      }
    },
    "lowest_average_day": "Tuesday",
    "highest_average_day": "Wednesday",
    "weekday_average": 637,
    "weekend_average": null,
    "weekend_premium_percentage": null,
    "method": "按去程日期与返程日期组合计算行程中位价，再按去程星期描述性汇总。"
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
        "average": 636,
        "median": 636
      },
      {
        "range": "31–60 days",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "60+ days",
        "count": 2,
        "average": 637.5,
        "median": 637.5
      }
    ],
    "lowest_average_window": "15–30 days",
    "method": "以采集日计算距去程日期的天数；仅作横截面描述。"
  },
  "round_trip_duration": {
    "median_nights": 3,
    "buckets": [
      {
        "range": "1–3 晚",
        "count": 2,
        "average": 637.5,
        "median": 637.5
      },
      {
        "range": "4–7 晚",
        "count": 1,
        "average": 636,
        "median": 636
      },
      {
        "range": "8–14 晚",
        "count": 0,
        "average": null,
        "median": null
      },
      {
        "range": "15 晚以上",
        "count": 0,
        "average": null,
        "median": null
      }
    ],
    "method": "按去程与返程日期之差统计行程晚数；价格比较受日期和样本范围影响。"
  },
  "holiday_effect": {
    "status": "insufficient_data",
    "message": "当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。"
  },
  "caveats": [
    "这是公开网页展示的往返总价快照，不是历史成交价，也不保证目前仍可订。",
    "去程与返程日期、税费、行李和来源口径可能不同；未知信息不作推测。"
  ]
}
