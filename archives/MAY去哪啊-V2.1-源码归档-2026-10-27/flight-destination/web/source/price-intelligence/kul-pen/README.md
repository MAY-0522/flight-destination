# KUL → PEN 初版价格数据与分析

此目录保存 KUL → PEN 航线的原始标价与分析报告；原始来源币种保留用于追溯，用户界面统一换算为人民币。

## 数据快照

- 采集/核对日期：2026-10-26（Asia/Singapore）
- 记录：45 条公开页面标价；覆盖 2026-10-27 至 2026-11-30，共 35 个出发日期
- 来源：AirAsia MOVE 的路线日历、Traveloka 的路线页
- 币种：MYR；行李额与假期状态未从页面样本中可靠确认，分别记录为 `unknown` 和 `null`
- 价格字段表示来源页面当时展示的路线标价，不保证可订、含税或包含行李；价格会变化

这些是单次页面快照，不是历史成交价或多日重复监测数据。它们只能用于验证数据格式和分析流程，不能据此声称已发现稳定的星期效应或最佳提前购买窗口。后续应按固定频率重新采样并保留每次采集时间。

## 人民币展示口径

- 原始观测与统计报告保留 MYR 来源金额，避免覆盖来源数据。
- 小程序结果页通过 `utils/currency-config.js` 将页面金额统一换算为 CNY；所有分位数、星期均价、周末/工作日均价、提前购买区间和折线图数值均使用同一换算。
- 参考汇率取马来西亚国家银行 2026-10-23 表：1 CNY = RM 0.6121，故 1 MYR ≈ CNY 1.6331。页面标明该汇率日期；它是参考汇率，不是实时兑换价。

## 文件

- `observations.json`：带来源链接的原始结构化观测记录
- `analyze.js`：无第三方依赖的分析脚本
- `analysis.json`：脚本输出；`analysis-data.js`：同一份报告的微信小程序可加载模块；星期、周末和提前购买统计先按出发日期汇总同日标价中位数，避免同一日期多个来源重复加权；价格分布同时提供原始标价分布

## 运行

在此目录运行 `node analyze.js`。脚本会验证必需字段，计算价格分位数、星期/周末和提前购买区间汇总；节假日字段未确认时会报告样本不足，不会补造结论。

## 可复核来源

- [AirAsia MOVE KUL–PEN route calendar](https://www.airasia.com/flights/from-kuala-lumpur-kul-to-penang-pen/)
- [Traveloka KUL–PEN route page](https://www.traveloka.com/en-my/flight/route/Kuala-Lumpur-Penang.KUL.PEN)


