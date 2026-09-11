# Hotel Room Booking — Coding Test (Raintech Software Limited)

A single-page room booking tool: pick dates, pick a room, see nights and total price.

## Stack

Plain HTML/CSS/JavaScript — no framework, no build step, no dependencies. Chosen so the
reviewer can open `index.html` directly with zero setup, and so the logic-vs-UI split is
visible without a bundler in the way.

## How to run

No install required.

- **Option A:** open `index.html` directly in a browser.
- **Option B (recommended, avoids any `file://` quirks):**
  ```bash
  npx serve .
  # or
  python3 -m http.server 5500
  ```
  then visit `http://localhost:5500`.

## How to run the tests

A small dependency-free test suite covers the night/price calculation, date validation,
and the bonus overlap check:

```bash
node tests/logic.test.js
```

## Project structure

```
index.html            markup
style.css              styling
app.js                 all logic (pure functions) + DOM wiring
tests/logic.test.js     unit tests for the pure functions in app.js
```

`app.js` is deliberately split in two: pure functions at the top (`validateDates`,
`nightsBetween`, `calculateTotal`, `rangesOverlap`, `isRoomAvailable`) with no DOM access,
followed by a `wireUpApp()` that hooks those functions up to the page. The pure functions
are exported CommonJS-style when `module` exists, which is what lets `tests/logic.test.js`
`require()` them directly in Node without a bundler or test framework.

## Requirements coverage

- **Room list** — the 5 sample rooms, hardcoded in `ROOMS` in `app.js`.
- **Date pickers** — native `<input type="date">` for check-in/check-out.
- **Room selection** — click a room card to select/deselect it.
- **Summary** — once dates are valid and a room is picked: nights, rate, total.
- **Validation:**
  - check-in cannot be before today (`checkin.min` is also set to today, plus a JS check
    so it's enforced even if the browser's native picker is bypassed)
  - check-out must be strictly after check-in (same-day is rejected)
  - errors are shown as inline text next to the relevant field, not just console logs or
    silent failures
- **Edge cases handled explicitly** (see `tests/logic.test.js`):
  - same check-in/check-out date → invalid
  - check-out before check-in → invalid
  - check-in in the past → invalid
  - missing date(s) → invalid, no crash
  - 1-night and multi-night stays calculate correctly

### Bonus features implemented

- **Booking overlap prevention** — `EXISTING_BOOKINGS` in `app.js` hardcodes two existing
  bookings (`R101` and `R201`). If the selected dates overlap an existing booking for a
  room, that room is shown as disabled ("Booked for these dates") in the list, and if it's
  already selected, a clear error replaces the summary instead of showing a price.
  Overlap uses standard half-open interval logic (`aStart < bEnd && bStart < aEnd`), so a
  check-out on day X and a check-in on day X for the same room are correctly treated as
  back-to-back, not overlapping.
- **Unit tests** — `tests/logic.test.js`, 15 assertions covering validation, night/price
  math, and overlap detection.
- **Filter by max guests** — a "Guests" dropdown (Any / 2+ / 3+ / 4+) filters the room list.

## What I'd improve with more time

- Replace the native `<input type="date">` with a small custom date-range picker so both
  fields can visually block out already-booked ranges for the currently selected room.
- Persist the guest-count filter and selected room in the URL so a booking-in-progress
  survives a refresh (no backend needed for this, just `URLSearchParams`).
- Add a lightweight DOM-level integration test (e.g. Playwright) on top of the existing
  pure-logic unit tests, to cover the click/selection flow end-to-end.
- Currency/locale formatting is hardcoded to `en-IN`/₹; would generalize if this needed to
  support other markets.
