# Public-page fare refresh Worker

This is a separate Cloudflare Worker for the scheduled public-page collector. It does not call airfare, OTA, airline, or metasearch APIs. It issues ordinary `GET` requests to the route pages listed in `routes.js`, skips blocked or unreadable pages, and records a fare only when a specific travel date and MYR amount are both visible near each other on a page that identifies KUL and the destination. Dates can be upcoming or explicitly dated in the past (including ISO `YYYY-MM-DD` dates).

## Schedule and duplicate policy

- Cron: `0 16 * * *` UTC, which is 00:00 every day in Beijing (Asia/Shanghai, UTC+8).
- The 60 public route pages are divided into seven daily groups. Each page is eligible at most once per seven days, and each URL is requested once per run.
- An identical source, route, trip type, date(s), currency and amount refreshes `last_seen` rather than creating another record. A changed amount is stored as a distinct observation.
- Past-departure quotes are limited to the last 365 days, require an explicit year, and are labeled `historical_public_quote`.
- A fare can be labeled `documented_transaction` without a manually curated source when nearby page text contains a payment/order statement and an explicitly dated order/payment cue within the last 365 days. The collector records that the page makes this claim; it cannot independently authenticate the traveler or payment.
- The one-year limit applies to past-departure quotes and the order/payment date. Upcoming trips may still appear when their order/payment record is within the last year.
- Login, CAPTCHA, access-denied, non-HTML and non-exact-date results are skipped. The collector does not attempt to bypass access controls.

## Cloudflare binding

Create a Workers KV namespace and bind it to this Worker as `PUBLIC_FARES`. The Worker stores per-page cooldowns, the last run status, and route-level observations in that namespace. Configure the Cron Trigger above. The Worker source is separate from the previous `flight-destination-api` service, which contains the old fare-provider integration.

## Data delivery

- `GET /status.json` returns the most recent run and schedule.
- `GET /public-fares.json?destination=DMK` returns the public-page observations for one destination.
- `GET /rankings.json?trip_type=one_way` returns deduplicated public quote identities across destinations, allowing the mini-program to merge them with its bundled samples and refresh the destination ranking.

These are the mini-program's own report delivery endpoints, not OTA fare APIs. After a scheduled page check succeeds, the Worker recalculates per-route one-way and round-trip summaries and saves them in KV as `analysis:<destination>:<trip_type>`, including record-type counts. The mini-program merges observations with bundled route samples, deduplicates by source, itinerary, and record type, and recalculates statistics when a route is opened. Historical public quotes and documented transaction records join the common descriptive analysis while remaining visible as separate record-type counts. The ranking endpoint reads stored public observations across destinations and returns only fields needed to deduplicate and count samples. When the mini-program remains open around midnight, it checks the run status and refreshes the ranking as soon as the daily run completes; reopening the mini-program also reloads the ranking. The date-based results flow reads these stored public observations instead of querying the retired fare-provider route.

## Limitations

Public page markup can change or omit exact-date prices. The route list must be manually curated before a source is treated as a public payment-evidence source; no transaction status is inferred from a fare listing alone. The collector uses only static page HTML and does not launch a browser, access private site interfaces, log in, or use a fare API. A run with zero new exact fares is valid; previous observations remain available.
