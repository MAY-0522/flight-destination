# Round-trip price data

Round-trip observations are stored separately from the existing one-way dataset:

```text
round-trips/routes/<destination-code>/route.json
round-trips/routes/<destination-code>/observations.json
```

Each observed fare must be a real, publicly displayed round-trip itinerary total. Do not add a one-way quote twice or estimate the return fare. Keep the original currency and source URL, and record both `flight_date` (outbound) and `return_date`. The analyzer derives itinerary duration from those dates.

Required observation fields: `origin`, `destination`, `trip_type` (`round_trip`), `flight_date`, `return_date`, `weekday`, `is_weekend`, `airline`, `price`, `currency`, `baggage`, `source`, `source_url`, `collected_at`, and `days_before_departure`. Unknown values may be `unknown` or `null`; never invent missing fare, airline, baggage, or holiday details.

Run `node price-intelligence/round-trips/analyze-round-trips.js` after adding verified samples. The current report index covers 50 of 59 destinations with 87 public quote rows. Expedia Malaysia data added on 2026-10-26 expands KUA (+4 rows), DMK (+6), RGN (+6), KNO (+2), TWU (+9), SUB (+2), BTU (+5) and AOR (+1). The remaining nine routes without round-trip data are TGG, TAG, KTI, BTJ, BDJ, LBJ, SRG, DIL and DLI. The mini program continues to show its unavailable-data message for these destinations and does not reuse one-way prices. Expedia says prices and availability can change; these public-page snapshots have not been individually confirmed through checkout and are not proof of current bookability. Small per-route samples support descriptive comparisons only.
