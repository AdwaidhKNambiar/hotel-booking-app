/*
 * Hotel Room Booking — core logic + DOM wiring.
 *
 * The pure calculation/validation functions live at the top and are
 * exported (Node-style) so they can be unit tested in isolation from
 * the DOM. The bottom half wires those functions up to the page.
 */

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ROOMS = [
  { code: "R101", type: "Deluxe Room", pricePerNight: 3500, maxGuests: 2 },
  { code: "R102", type: "Deluxe Room", pricePerNight: 3500, maxGuests: 2 },
  { code: "R201", type: "Executive Suite", pricePerNight: 5800, maxGuests: 3 },
  { code: "R202", type: "Executive Suite", pricePerNight: 5800, maxGuests: 3 },
  { code: "R301", type: "Family Room", pricePerNight: 4200, maxGuests: 4 },
];

// Bonus: a couple of hardcoded existing bookings to test overlap-prevention
// against. Dates are ISO strings (YYYY-MM-DD), check-out is exclusive
// (i.e. the room is free again the night of the check-out date).
const EXISTING_BOOKINGS = [
  { roomCode: "R101", checkIn: "2026-09-20", checkOut: "2026-09-24" },
  { roomCode: "R201", checkIn: "2026-10-01", checkOut: "2026-10-03" },
];

// ---------------------------------------------------------------------------
// Pure logic (no DOM access below this line until wireUpApp)
// ---------------------------------------------------------------------------

/**
 * Parse a "YYYY-MM-DD" string into a local Date at midnight.
 * Using the manual split (rather than `new Date(str)`) avoids the
 * UTC-parsing off-by-one-day bug in some browsers/timezones.
 */
function parseISODate(isoString) {
  if (!isoString) return null;
  const [y, m, d] = isoString.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Validate a check-in/check-out pair.
 * Returns { valid: true } or { valid: false, message: string }.
 */
function validateDates(checkInStr, checkOutStr) {
  if (!checkInStr || !checkOutStr) {
    return { valid: false, message: "Choose both a check-in and check-out date." };
  }

  const checkIn = parseISODate(checkInStr);
  const checkOut = parseISODate(checkOutStr);

  if (!checkIn || !checkOut) {
    return { valid: false, message: "Those dates don't look valid." };
  }

  if (checkIn < startOfToday()) {
    return { valid: false, message: "Check-in can't be in the past." };
  }

  if (checkOut <= checkIn) {
    return { valid: false, message: "Check-out must be after check-in." };
  }

  return { valid: true };
}

/**
 * Number of nights between two ISO date strings.
 * Assumes the dates have already passed validateDates.
 */
function nightsBetween(checkInStr, checkOutStr) {
  const MS_PER_NIGHT = 24 * 60 * 60 * 1000;
  const checkIn = parseISODate(checkInStr);
  const checkOut = parseISODate(checkOutStr);
  if (!checkIn || !checkOut) return 0;
  return Math.round((checkOut - checkIn) / MS_PER_NIGHT);
}

function calculateTotal(nights, pricePerNight) {
  if (nights <= 0) return 0;
  return nights * pricePerNight;
}

/**
 * Bonus: two date ranges [aStart, aEnd) and [bStart, bEnd) overlap if
 * aStart < bEnd AND bStart < aEnd. Check-out day itself is not counted
 * as occupied (a guest checking out on the 24th and another checking
 * in on the 24th is a valid back-to-back booking).
 */
function rangesOverlap(aStartStr, aEndStr, bStartStr, bEndStr) {
  const aStart = parseISODate(aStartStr);
  const aEnd = parseISODate(aEndStr);
  const bStart = parseISODate(bStartStr);
  const bEnd = parseISODate(bEndStr);
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Bonus: is `roomCode` free for [checkInStr, checkOutStr) given a list
 * of existing bookings?
 */
function isRoomAvailable(roomCode, checkInStr, checkOutStr, bookings = EXISTING_BOOKINGS) {
  return !bookings.some(
    (b) =>
      b.roomCode === roomCode &&
      rangesOverlap(checkInStr, checkOutStr, b.checkIn, b.checkOut)
  );
}

function formatINR(amount) {
  return "₹" + amount.toLocaleString("en-IN");
}

// Expose the pure functions for Node-based unit tests (see tests/logic.test.js).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ROOMS,
    EXISTING_BOOKINGS,
    parseISODate,
    validateDates,
    nightsBetween,
    calculateTotal,
    rangesOverlap,
    isRoomAvailable,
    formatINR,
  };
}

// ---------------------------------------------------------------------------
// DOM wiring — only runs in the browser
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  wireUpApp();
}

function wireUpApp() {
  const roomListEl = document.getElementById("roomList");
  const guestFilterEl = document.getElementById("guestFilter");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const dateErrorEl = document.getElementById("dateError");
  const bookingErrorEl = document.getElementById("bookingError");
  const selectedRoomBoxEl = document.getElementById("selectedRoomBox");
  const summaryEl = document.getElementById("summary");
  const sumNightsEl = document.getElementById("sumNights");
  const sumRateEl = document.getElementById("sumRate");
  const sumTotalEl = document.getElementById("sumTotal");

  let selectedRoomCode = null;

  function currentDates() {
    return { checkIn: checkinEl.value, checkOut: checkoutEl.value };
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function hideError(el) {
    el.hidden = true;
    el.textContent = "";
  }

  function renderRoomList() {
    const minGuests = Number(guestFilterEl.value) || 0;
    const { checkIn, checkOut } = currentDates();
    const datesValid = validateDates(checkIn, checkOut).valid;

    const visibleRooms = ROOMS.filter((room) => room.maxGuests >= minGuests);

    roomListEl.innerHTML = "";

    if (visibleRooms.length === 0) {
      const empty = document.createElement("li");
      empty.className = "no-rooms";
      empty.textContent = "No rooms match that guest count.";
      roomListEl.appendChild(empty);
      return;
    }

    visibleRooms.forEach((room) => {
      const unavailable =
        datesValid && !isRoomAvailable(room.code, checkIn, checkOut);

      const li = document.createElement("li");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "room-card";
      if (room.code === selectedRoomCode) button.classList.add("is-selected");
      if (unavailable) button.classList.add("is-unavailable");
      button.disabled = unavailable;
      button.setAttribute("aria-pressed", room.code === selectedRoomCode ? "true" : "false");

      button.innerHTML = `
        <span class="room-code">${room.code}</span>
        <span class="room-main">
          <p class="room-type">${room.type}</p>
          <p class="room-meta">Up to ${room.maxGuests} guests${unavailable ? " · Booked for these dates" : ""}</p>
        </span>
        <span class="room-price">
          <span class="amount">${formatINR(room.pricePerNight)}</span>
          <span class="per">per night</span>
        </span>
      `;

      button.addEventListener("click", () => {
        if (unavailable) return;
        selectedRoomCode = room.code === selectedRoomCode ? null : room.code;
        renderRoomList();
        updateSummary();
      });

      li.appendChild(button);
      roomListEl.appendChild(li);
    });
  }

  function updateSelectedRoomBox() {
    const room = ROOMS.find((r) => r.code === selectedRoomCode);
    if (!room) {
      selectedRoomBoxEl.innerHTML = `<p class="muted">No room selected yet — choose one from the list.</p>`;
      return;
    }
    selectedRoomBoxEl.innerHTML = `
      <p class="picked-type">${room.type}</p>
      <p class="picked-code">${room.code} · Up to ${room.maxGuests} guests</p>
    `;
  }

  function updateSummary() {
    updateSelectedRoomBox();

    const { checkIn, checkOut } = currentDates();
    const dateResult = validateDates(checkIn, checkOut);

    hideError(dateErrorEl);
    hideError(bookingErrorEl);
    summaryEl.hidden = true;

    if (!dateResult.valid) {
      if (checkIn || checkOut) showError(dateErrorEl, dateResult.message);
      return;
    }

    if (!selectedRoomCode) {
      return; // dates are fine, just waiting on a room pick
    }

    const room = ROOMS.find((r) => r.code === selectedRoomCode);

    if (!isRoomAvailable(room.code, checkIn, checkOut)) {
      showError(bookingErrorEl, `${room.code} is already booked for part of that date range. Pick different dates or another room.`);
      return;
    }

    const nights = nightsBetween(checkIn, checkOut);
    const total = calculateTotal(nights, room.pricePerNight);

    sumNightsEl.textContent = nights;
    sumRateEl.textContent = formatINR(room.pricePerNight);
    sumTotalEl.textContent = formatINR(total);
    summaryEl.hidden = false;
  }

  function handleDatesChanged() {
    renderRoomList(); // availability/highlighting depends on the current dates
    updateSummary();
  }

  checkinEl.addEventListener("change", handleDatesChanged);
  checkoutEl.addEventListener("change", handleDatesChanged);
  guestFilterEl.addEventListener("change", () => {
    renderRoomList();
    updateSummary();
  });

  // Default check-in to today so the date inputs aren't empty on load.
  const today = startOfToday();
  checkinEl.value = today.toISOString().slice(0, 10);
  checkinEl.min = today.toISOString().slice(0, 10);

  renderRoomList();
  updateSummary();
}
