# Flight Price Intelligence data pipeline

## Scope

The destination pool currently covers 59 KUL routes. The latest generated one-way report index has 57 routes and 484 observations; two destinations have no one-way price report yet. The homepage shows the ten destinations with the most captured quote rows, sorted by sample count; ties preserve the configured destination order. Fare observations retain the source currency shown on the public page (currently MYR for captured samples). The mini program converts amounts to CNY using the dated Bank Negara Malaysia reference-rate snapshot in `utils/currency-config.js`; each observation retains its original fare, currency, source URL and collection date.

The mini program also supports selecting one-way or round-trip analysis. Round-trip fares are kept in the separate `round-trips/` dataset and report index. The latest index has 50 of 59 destination routes and 87 observations. Routes without a round-trip report continue to show the unavailable-data message; one-way prices are never reused as return fares. These changeable web snapshots are descriptive references, not proof of current bookability. See `round-trips/README.md` for the round-trip schema and analyzer.

Collecting only fares already displayed in CNY would narrow the available source set and could introduce market or currency-selection bias. The dataset therefore preserves original amounts and performs one transparent conversion for comparison.

## Refresh and analysis

1. Add only fares directly observed on a public source page to the route's `observations.json`. Do not infer missing prices, airline names, baggage details or holiday status.
2. Keep `price` and `currency` exactly as displayed. Set unknown fields to `unknown` or `null`.
3. Record collection date, route, departure date, source, source URL, and source freshness note.
4. Run `node price-intelligence/analyze-routes.js` from the project root. This validates one-way observations and writes each `analysis.json`, `analysis-data.js`, and the static `route-reports.js` index used by the mini program.
5. Run `node price-intelligence/round-trips/analyze-round-trips.js` to regenerate round-trip reports, then `node price-intelligence/build-observation-index.js` to rebuild the WeChat-compatible offline observation modules used by runtime fare analysis.

The Cloudflare public-page collector also supplies incremental exact-date observations at runtime. The analysis page combines these with bundled observations, deduplicates to the latest quote per source and itinerary for statistical calculations, and recomputes the displayed distribution and date-based summaries. The Worker retains quote provenance (source name and URL, itinerary dates, fare amount/currency, fare basis, collection date, and observation/last-seen timestamps). Its daily job runs at Beijing 00:00; route pages are checked on a seven-day rotation, so daily scheduling does not mean every page is fetched every day. When the revised Worker response is deployed, the page also shows the latest run and route-page check times.

## Current snapshot

All data were collected or extracted on 2026-10-26 and concern publicly displayed one-way fares, mostly for November 2026 departures. The crawl age of the underlying source page is separately recorded in route metadata and shown on each analysis page. CNX, CGK and MNL have older indexed snapshots or cached route details; they should be treated with additional caution. The displayed collection date means the date this project captured the indexed quote, not proof that the fare was still bookable then.

| Route | Quotes | Distinct departure dates | Source | Source-page freshness |
| --- | ---: | ---: | --- | --- |
| KUL → PEN | 45 | 35 | AirAsia MOVE, Traveloka | See existing route README |
| KUL → SIN | 30 | 30 | AirAsia MOVE | Captured 2026-10-26 |
| KUL → BKK | 5 | 5 | AirAsia MOVE, VietJet | Captured 2026-10-26; VietJet states fare snapshots within 24h |
| KUL → HKT | 26 | 26 | AirAsia MOVE | Captured 2026-10-26 |
| KUL → CNX | 19 | 19 | AirAsia MOVE | Search index about one month old |
| KUL → DPS | 30 | 30 | AirAsia MOVE | Captured 2026-10-26 |
| KUL → CGK | 30 | 30 | AirAsia MOVE | Search index about 5 days old |
| KUL → SGN | 30 | 30 | AirAsia MOVE | Captured 2026-10-26 |
| KUL → HAN | 30 | 30 | AirAsia MOVE | Captured 2026-10-26 |
| KUL → MNL | 9 | 9 | Traveloka | Search listing captured 2026-10-26; detail index about 3 weeks old |

## Interpretation

Samples now carry a record type: current public quote, past-departure public quote, or page-stated order record. Past-departure quotes and dated order/payment statements are limited to the last 365 days. Order records are detected from public page text without manual source curation, but are not independently authenticated. These types contribute to the shared descriptive fare analysis and are reported separately in the sample breakdown. Purchase-window analysis excludes past-departure records unless a documented purchase/quote date supports a non-negative lead time. With small route-level samples, results remain exploratory. Holiday flags and baggage are unknown unless a source explicitly confirms them. Never describe a low sample fare as guaranteed or as an optimal booking window.

## Expedia collection batch (2026-10-26)

This collection added 9 exact-date one-way public fare listings and 35 round-trip quote rows from Expedia Malaysia, plus 38 one-way entries from Traveloka Malaysia's date-specific listings. Expedia expanded KUA, DMK, RGN, KNO, TWU, SUB, AOR, BTU and DLI one-way samples, and added round-trip samples for KUA, DMK, RGN, KNO, TWU, SUB, AOR and BTU. Traveloka added 8 BDJ observations, 10 SRG observations, 10 BTJ observations and 10 DMK observations. Each row records the displayed dates, MYR price, source URL and collection date. Carrier is `unknown` where the source did not tie a carrier to the particular fare. Expedia describes its fares as available within the previous seven days; Traveloka pages include date-price listings and scheduled direct service for these routes, but some calendar prices are not linked to a specific carrier or routing. None were individually verified through checkout; price and availability can change.

| Route | New one-way rows | New round-trip rows | Example displayed fare |
| --- | ---: | ---: | --- |
| KUL → KUA | 1 | 4 | MYR 88 one-way, 2027-02-18; MYR 197 return, 2027-02-22–25 |
| KUL → DMK | 11 (1 Expedia + 10 Traveloka) | 6 | MYR 293 one-way, 2027-07-03; MYR 662 return, 2027-04-29–05-02 |
| KUL → RGN | 1 | 6 | MYR 324 one-way, 2027-02-21; MYR 758 return, 2027-02-21–28 |
| KUL → KNO | 1 | 2 | MYR 204 one-way, 2027-03-02; MYR 565 return, 2027-01-22–24 |
| KUL → TWU | 1 | 9 | MYR 299 one-way, 2026-11-13; MYR 597 return, 2026-11-13–19 |
| KUL → SUB | 1 | 2 | MYR 310 one-way, 2027-08-02; MYR 620 return, 2027-02-17–19 |
| KUL → AOR | 1 | 1 | MYR 98 one-way, 2027-02-23; MYR 195 return, 2027-07-10–12 |
| KUL → BTU | 1 | 5 | MYR 158 one-way, 2027-02-20; MYR 327 return, 2027-04-28–05-05 |
| KUL → DLI | 1 | 0 | MYR 297 one-way, 2027-03-03 |

Traveloka added one named-carrier KUL-BDJ fare (MYR 334.36 on 2026-11-12), date-price calendar entries for KUL-BDJ on another 7 dates (MYR 320–412), KUL-SRG on 10 dates (MYR 311–377), KUL-BTJ on 10 dates (MYR 163–235), and KUL-DMK on 10 dates (MYR 272–365). Carrier remains `unknown` where the public page does not associate a calendar amount with a named flight. See the route-specific `observations.json` files for exact dates and source URLs.

## Scheduled refresh and OTA access

The collector is configured to run daily at 00:00 Beijing time (Asia/Shanghai, UTC+8), equivalent to 16:00 UTC on the previous day. Cloudflare KV stores the per-page search ledger and observations; source pages rotate across seven daily groups, and unchanged query results are not duplicated. The deployed Worker serves collected rows from `/public-fares.json?destination=...`, and the mini-program analysis page now displays those rows alongside its bundled analysis. See [`AUTOMATED-REFRESH.md`](AUTOMATED-REFRESH.md) and [`../cloudflare-worker/README.md`](../cloudflare-worker/README.md) for collection details and limits.


## Earlier destination expansion to 30

The 20 routes added in this iteration are KCH, BKI, LGK, JHB, KNO, LOP, YIA, SUB, DAD, CXR, PQC, KTI, SAI, VTE, BWN, CEB, HDY, KBV, AOR and KBR. Prices were transcribed from public AirAsia MOVE route pages/search-index fare calendars on 2026-10-26. Airline is marked unknown where a carrier could not be tied to an individual calendar price. Route source pages may have older or unspecified index freshness; every record is a displayed one-way fare snapshot, not a live availability check. The sample counts are intentionally not padded. Some routes have only two to five observed dates, so their weekly or advance-purchase comparisons are descriptive and often too weak for a dependable conclusion.

| Route | Quotes | Distinct departure dates | Source | Page freshness |
| --- | ---: | ---: | --- | --- |
| KUL → KCH (古晋) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → BKI (亚庇) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → LGK (兰卡威) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → JHB (新山) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → KNO (棉兰) | 2 | 2 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → LOP (龙目岛) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → YIA (日惹) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → SUB (泗水) | 2 | 2 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → DAD (岘港) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → CXR (芽庄) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → PQC (富国岛) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → KTI (金边) | 3 | 3 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → SAI (暹粒) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → VTE (万象) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → BWN (斯里巴加湾) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → CEB (宿务) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → HDY (合艾) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → KBV (甲米) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → AOR (亚罗士打) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → KBR (哥打巴鲁) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |

At this stage of the project, the homepage sorted the then-current 30 destinations by quote-row count, descending, with the configured pool order as a stable tie-break. The later expansion to 50 routes is documented below.


## Destination pool expansion to 50

This iteration added 20 destinations to the searchable pool: MYY, SBW, TWU, SDK, TGG, KOS, PKU, PLM, PDG, PNK, UPG, BPN, CGY, TAG, ILO, DVO, BTU, LBU, BTH, LPQ. Each has a route report and source-linked public fare observations. Most have 2–5 departure dates; CGY and ILO have more observed dates, while DVO only has two December connections. The analysis page discloses sample size and source limitations.

| Route | Quotes | Distinct departure dates | Source | Page freshness |
| --- | ---: | ---: | --- | --- |
| KUL → MYY (美里) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → SBW (诗巫) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → TWU (斗湖) | 2 | 2 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → SDK (山打根) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → TGG (瓜拉丁加奴) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → KOS (西哈努克市) | 3 | 3 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → PKU (北干巴鲁) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → PLM (巨港) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → PDG (巴东) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → PNK (坤甸) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → UPG (望加锡) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → BPN (巴厘巴板) | 4 | 4 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → CGY (卡加延德奥罗) | 10 | 10 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → TAG (塔比拉兰) | 2 | 2 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → ILO (伊洛伊洛) | 7 | 7 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → DVO (达沃) | 2 | 2 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → BTU (民都鲁) | 4 | 4 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → LBU (纳闽) | 4 | 4 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → BTH (巴淡岛) | 5 | 5 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |
| KUL → LPQ (琅勃拉邦) | 3 | 3 | AirAsia MOVE | Search-index snapshot, captured 2026-10-26 |

The homepage continues to show only ten destinations, ranked by the number of captured fare observations. All other 40 destinations can be found from the searchable picker, which sorts Chinese city names by pinyin and shows the country beside each name.


