# Scheduled public fare refresh

## Current state

The mini program's interactive fare search and analysis page read the deployed public-page collector through `utils/flight-api.js` and `pages/insights/insights.js`. Bundled public observations remain the offline baseline; when cloud observations load, the analysis page merges them and recomputes its fare distribution, weekday/weekend comparison, advance-purchase buckets, and round-trip duration.

## Can this be automated?

Yes, as a best-effort public-page collector. A scheduled cloud process can open selected OTA and fare-comparison pages without logging in, extract only fares that include a specific route, travel date, amount, and currency, and publish the resulting report data for the mini program to read. It does not depend on airline or OTA fare APIs.

Public-site layouts change. Some sites render fares with JavaScript, throttle automated page visits, or sometimes require login or CAPTCHA. The collector must skip a page when it cannot retrieve a public, exact-date fare; it must not bypass access controls or invent a price from a general “from” amount. A source that stops exposing its public results will simply stop contributing new observations until the page becomes readable again.

## Schedule behavior

The selected schedule for this project is:

- Daily refresh at 00:00 China Standard Time (Asia/Shanghai, UTC+8).
- This corresponds to 16:00 UTC on the previous calendar day for Cloudflare Cron.
- The app displays the last recorded run and route-page check status. Cloudflare owns the schedule; pause/resume controls are not part of the current mini-program UI.

The schedule must run in the cloud, not inside an open mini-program session. Cloudflare Cron Triggers execute in UTC. A single daily trigger at `0 16 * * *` UTC corresponds to midnight in Beijing. Beijing and Singapore are both UTC+8, but Beijing is the selected user-facing timezone. Do not describe the setting as Singapore time.

### Duplicate-search and duplicate-record rules

- Maintain a durable search ledger keyed by source, origin, destination, trip type, exact travel date (and exact return date for round trips), and market/locale. Record the last attempt, result, and next eligible refresh time.
- Within a scheduled run, request each ledger key at most once, even if it is discovered through multiple route lists or source adapters.
- Do not re-fetch an unchanged query every day just to create another copy of the same result. Recheck only when the source page has new travel dates, the last attempt found no usable fare and its retry interval has elapsed, or a configured freshness interval expires. Use a conservative default freshness interval of 7 days for a known query; allow a new exact-date page or a detected source update to trigger an earlier check.
- Deduplicate stored observations by source, route, trip type, travel date(s), currency, and fare amount. If the same key returns the same fare, update its `last_seen` timestamp rather than appending another observation. If the fare changes, retain a new dated price-change observation linked to the prior value.
- Apply per-source request limits and backoff after errors, rate limits, or CAPTCHA. Do not retry the same failed page repeatedly during one run.

This approach avoids redundant page visits and duplicate records while still allowing a fare that has gone stale to be checked again. A true daily price comparison for an unchanged route/date requires revisiting that page daily; that conflicts with the request to avoid repeated searches, so the default policy prioritizes incremental discovery and a 7-day freshness check. The cadence can be tightened later if daily price movement becomes more important than reducing repeated searches.

After a valid exact fare is found, retain its source URL, exact itinerary, currency, collection date, and observation/last-seen timestamps. The mini program merges cloud observations with bundled baseline observations at runtime. For analysis it keeps only the latest observation per source and itinerary, so unchanged daily revisits do not inflate sample counts; the Worker still retains distinct price changes as provenance-bearing records. If cloud data is unavailable, the bundled report remains available.

## Public sources to try

| Source | Public-page result in this research | Collection approach |
| --- | --- | --- |
| Expedia Malaysia | Public route pages exposed exact itinerary cards and exact-date fares in prior research. | Open the public route page and extract the displayed itinerary; skip general starting fares. |
| Traveloka Malaysia | Public route pages exposed date-price calendars and some named flight listings. | Extract exact calendar dates and displayed prices; store carrier/routing as unknown if the page does not tie the calendar price to an itinerary. |
| Skyscanner | Public route pages exposed price-calendar and monthly summaries. | Store only if a specific date and fare are both exposed; broad “from” ranges are not observations. |
| Wego | Public route pages exposed fare guidance and route schedules. | Store only exact date-price pairs; skip route-wide price guidance. |
| Qunar / 去哪儿 | The public homepage/flight site did not expose a stable fare result in the text browser for the tested route. | Try an anonymous public page in a browser renderer; skip if the result requires account access, CAPTCHA or an unparseable page. |
| Tongcheng / 同程 | The public flight page was not reliably readable in the current browser research. | Same public-page-only rule; no partner or private interface. |
| Ctrip / 携程 | The public flight homepage opened, but dynamic fare cards were not exposed by the current text browser. | Try the publicly accessible search page in a browser renderer; do not use supplier endpoints. |
| Fliggy / 飞猪 | The public homepage opened, but no exact-date fare card was exposed in the current text browser. | Try anonymous public search pages only; stop when sign-in or CAPTCHA is required. |
| Trip.com | Its public flight landing page opened, but the current text response did not contain a date-specific search result. | Try anonymous public search pages only; skip affiliate, supplier or private APIs. |

Search pages can vary by market, locale and browser rendering. The list above means “worth trying publicly,” not a guarantee that each site will return usable fares on every run. The initial live sources should be the public pages that currently expose exact-date prices; the rest can remain enabled as optional sources that contribute only when their public result page is readable.

## Implementation dependency

The old `flight-destination-api` Worker code has been replaced with the public-page collector. The Cloudflare service retains the existing hostname, KV binding `PUBLIC_FARES`, and daily Cron trigger at `0 16 * * *` UTC (Beijing midnight). The updated Worker is deployed. The collector covers 60 route-page URLs across 53 destinations and rotates page checks across seven daily groups. The mini program shows the daily task's last-run time and the route's latest source-page check. A page is checked at most once every seven days. It uses no airfare APIs.

The latest Worker editor source is `cloudflare-worker/worker-paste.js`. Redeploy it after an update to expose per-page `source_status`, ISO observation timestamps, and per-route check timestamps. The mini program remains compatible with older Worker responses while these fields are absent.
