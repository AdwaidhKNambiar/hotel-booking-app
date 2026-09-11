/*
 * Minimal unit tests for the pure logic in app.js.
 * No test framework needed — run with: node tests/logic.test.js
 */

const assert = require("assert");
const {
  validateDates,
  nightsBetween,
  calculateTotal,
  rangesOverlap,
  isRoomAvailable,
} = require("../app.js");

let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  - ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  - ${name}`);
    console.error(`        ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("validateDates");
test("rejects a check-in date in the past", () => {
  const result = validateDates("2000-01-01", "2000-01-05");
  assert.strictEqual(result.valid, false);
});

test("rejects check-out equal to check-in (same-day)", () => {
  const result = validateDates("2027-01-10", "2027-01-10");
  assert.strictEqual(result.valid, false);
});

test("rejects check-out before check-in", () => {
  const result = validateDates("2027-01-10", "2027-01-05");
  assert.strictEqual(result.valid, false);
});

test("rejects missing dates", () => {
  assert.strictEqual(validateDates("", "2027-01-05").valid, false);
  assert.strictEqual(validateDates("2027-01-05", "").valid, false);
});

test("accepts a valid future range", () => {
  const result = validateDates("2027-01-10", "2027-01-12");
  assert.strictEqual(result.valid, true);
});

console.log("nightsBetween / calculateTotal");
test("counts a single night correctly", () => {
  assert.strictEqual(nightsBetween("2027-01-10", "2027-01-11"), 1);
});

test("counts a multi-night stay correctly", () => {
  assert.strictEqual(nightsBetween("2027-01-10", "2027-01-15"), 5);
});

test("total price = nights x rate", () => {
  const nights = nightsBetween("2027-01-10", "2027-01-15");
  assert.strictEqual(calculateTotal(nights, 3500), 17500);
});

test("total is 0 for a non-positive night count", () => {
  assert.strictEqual(calculateTotal(0, 3500), 0);
  assert.strictEqual(calculateTotal(-2, 3500), 0);
});

console.log("rangesOverlap / isRoomAvailable");
test("detects overlapping ranges", () => {
  assert.strictEqual(rangesOverlap("2027-02-01", "2027-02-05", "2027-02-03", "2027-02-07"), true);
});

test("does not flag back-to-back ranges as overlapping", () => {
  // one guest checks out the 5th, another checks in the 5th
  assert.strictEqual(rangesOverlap("2027-02-01", "2027-02-05", "2027-02-05", "2027-02-08"), false);
});

test("does not flag fully separate ranges as overlapping", () => {
  assert.strictEqual(rangesOverlap("2027-02-01", "2027-02-05", "2027-03-01", "2027-03-05"), false);
});

test("isRoomAvailable returns false for a room with a clashing hardcoded booking", () => {
  const bookings = [{ roomCode: "R101", checkIn: "2026-09-20", checkOut: "2026-09-24" }];
  assert.strictEqual(isRoomAvailable("R101", "2026-09-22", "2026-09-23", bookings), false);
});

test("isRoomAvailable returns true when dates don't clash", () => {
  const bookings = [{ roomCode: "R101", checkIn: "2026-09-20", checkOut: "2026-09-24" }];
  assert.strictEqual(isRoomAvailable("R101", "2026-10-01", "2026-10-03", bookings), true);
});

test("isRoomAvailable ignores bookings for a different room", () => {
  const bookings = [{ roomCode: "R101", checkIn: "2026-09-20", checkOut: "2026-09-24" }];
  assert.strictEqual(isRoomAvailable("R102", "2026-09-20", "2026-09-24", bookings), true);
});

console.log(`\n${passed} test(s) passed.`);
