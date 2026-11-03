'use strict'
const fs = require('fs')
const path = require('path')
const root = __dirname
const routeDirs = ['kul-pen', ...fs.readdirSync(path.join(root,'routes')).filter(name => fs.statSync(path.join(root,'routes',name)).isDirectory()).map(name => `routes/${name}`)]
const round = n => n == null ? null : Math.round(n * 100) / 100
const median = values => { const a=[...values].sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2 }
const quantile = (values,p) => { const a=[...values].sort((x,y)=>x-y);if(!a.length)return null;const pos=(a.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return a[lo]+(a[hi]-a[lo])*(pos-lo) }
const summarize = values => values.length ? {count:values.length,average:round(values.reduce((a,b)=>a+b,0)/values.length),median:round(median(values))} : {count:0,average:null,median:null}
const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
for (const rel of routeDirs) {
 const dir=path.join(root,rel), observations=JSON.parse(fs.readFileSync(path.join(dir,'observations.json'),'utf8'))
 if(!observations.length) throw new Error(`${rel} has no observations`)
 const routeData=fs.existsSync(path.join(dir,'route.json'))?JSON.parse(fs.readFileSync(path.join(dir,'route.json'),'utf8')):{origin:observations[0].origin,destination:observations[0].destination,trip_type:observations[0].trip_type,currency:observations[0].currency}
 for(const [i,row] of observations.entries()) {
   for(const key of ['origin','destination','trip_type','flight_date','weekday','is_weekend','airline','price','currency','baggage','source','source_url','collected_at','days_before_departure']) if(!(key in row)) throw new Error(`${rel} row ${i+1} missing ${key}`)
   if(row.origin!==routeData.origin||row.destination!==routeData.destination||row.currency!==routeData.currency)throw new Error(`${rel} row ${i+1} route/currency mismatch`)
   if(!Number.isFinite(row.price)||row.price<=0||!row.source_url.startsWith('https://'))throw new Error(`${rel} row ${i+1} invalid fare/source`)
 }
 const dates=new Map()
 for(const row of observations){if(!dates.has(row.flight_date))dates.set(row.flight_date,[]);dates.get(row.flight_date).push(row.price)}
 const samples=[...dates.entries()].map(([date,prices])=>{const day=new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'});const first=observations.find(row=>row.flight_date===date);return{flight_date:date,weekday:day,is_weekend:day==='Saturday'||day==='Sunday',price:median(prices),days_before_departure:first.days_before_departure}})
 const weekdays={}
 for(const day of dayNames){weekdays[day]=summarize(samples.filter(s=>s.weekday===day).map(s=>s.price))}
 const weekdayVals=samples.filter(s=>!s.is_weekend).map(s=>s.price),weekendVals=samples.filter(s=>s.is_weekend).map(s=>s.price)
 const weekdayAverage=weekdayVals.length?weekdayVals.reduce((a,b)=>a+b,0)/weekdayVals.length:null
 const weekendAverage=weekendVals.length?weekendVals.reduce((a,b)=>a+b,0)/weekendVals.length:null
 const ranges=[{label:'0–3 days',min:0,max:3},{label:'4–7 days',min:4,max:7},{label:'8–14 days',min:8,max:14},{label:'15–30 days',min:15,max:30},{label:'31–60 days',min:31,max:60},{label:'60+ days',min:61,max:Infinity}]
 const buckets=ranges.map(r=>{const values=samples.filter(s=>s.days_before_departure>=r.min&&s.days_before_departure<=r.max).map(s=>s.price),summary=summarize(values);return{range:r.label,count:summary.count,average:summary.average,median:summary.median}})
 const values=observations.map(r=>r.price),holidays=observations.filter(r=>typeof r.is_holiday==='boolean')
 const ordered=Object.entries(weekdays).filter(([,v])=>v.count).sort((a,b)=>a[1].average-b[1].average)
 const uniqueSources=[...new Set(observations.map(r=>r.source))], collectionDates=[...new Set(observations.map(r=>r.collected_at))].sort()
 const n=observations.length,level=n>=200?'较高':n>=50?'一般':'较低'
 const report={
  route:{origin:routeData.origin,destination:routeData.destination,trip_type:routeData.trip_type,currency:routeData.currency},
  generated_at:new Date().toISOString(),
  sample:{observation_count:n,distinct_departure_dates:samples.length,sources:uniqueSources,collection_dates:collectionDates,source_freshness_note:routeData.source_freshness_note||'来源页面采集时间未单独标注',reference_level:level,reference_reason:`本次仅收集到 ${n} 条公开标价，属于网页快照样本；样本范围有限，结论仅作参考，不代表历史成交价或未来票价。`},
  price_distribution_raw_quotes:{count:n,minimum:Math.min(...values),p10:round(quantile(values,.1)),p25:round(quantile(values,.25)),median:round(quantile(values,.5)),p75:round(quantile(values,.75)),p90:round(quantile(values,.9)),maximum:Math.max(...values)},
  weekday_effect_by_departure_date_median:{weekdays,lowest_average_day:ordered[0]?.[0]||null,highest_average_day:ordered[ordered.length-1]?.[0]||null,weekday_average:round(weekdayAverage),weekend_average:round(weekendAverage),weekend_premium_percentage:weekdayAverage&&weekendAverage?round((weekendAverage-weekdayAverage)/weekdayAverage*100):null,method:'先按出发日期对来源标价取中位数，再按星期描述性汇总；不是稳定规律'},
  advance_purchase_window_by_departure_date_median:{buckets,lowest_average_window:buckets.filter(b=>b.count).sort((a,b)=>a.average-b.average)[0]?.range||null,method:'以采集日计算提前天数；不同出发日横截面对比，不能推断同一航班价格随时间变化'},
  holiday_effect:holidays.length>=3?{status:'available'}:{status:'insufficient_data',message:'当前样本没有足够且可靠的假期标记，暂时无法判断节假日价格规律。'},
  caveats:['这是公开网页展示标价的一次性快照，不是历史成交价，也不保证目前仍可订。','税费、行李额度、航班时间与来源口径可能不同；baggage 未确认时标为 unknown。','日期价表页面的更新频率因来源而异；星期效应和提前购买差异仅为探索性描述。']
 }
 fs.writeFileSync(path.join(dir,'analysis.json'),JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(path.join(dir,'analysis-data.js'),`module.exports = ${JSON.stringify(report,null,2)}\n`)
 console.log(`${routeData.origin}-${routeData.destination}: ${n} quotes / ${samples.length} dates / ${uniqueSources.length} sources`)
}
const reportEntries=routeDirs.map(rel=>{const data=JSON.parse(fs.readFileSync(path.join(root,rel,'analysis.json'),'utf8'));return `  ${JSON.stringify(data.route.destination)}: require('./${rel.replace(/\\/g,'/')}/analysis-data.js')`})
fs.writeFileSync(path.join(root,'route-reports.js'),`// Generated by analyze-routes.js; static requires are compatible with WeChat Mini Program bundling.\nmodule.exports = {\n${reportEntries.join(',\n')}\n}\n`)
