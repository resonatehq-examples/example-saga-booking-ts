import { Resonate } from "@resonatehq/sdk";
import { bookTrip } from "./workflow";

// ---------------------------------------------------------------------------
// Resonate setup — two lines
// ---------------------------------------------------------------------------

const resonate = new Resonate();
resonate.register(bookTrip);

// ---------------------------------------------------------------------------
// Run the saga
// ---------------------------------------------------------------------------

const shouldFail = process.argv.includes("--fail");
const tripId = `trip-${Date.now()}`;

console.log("=== Resonate Saga Pattern: Trip Booking ===");
console.log(
  `Mode: ${shouldFail ? "FAILURE (car rental will fail, triggering compensation)" : "SUCCESS (all bookings will succeed)"}`,
);

const result = await resonate.run(
  `saga/${tripId}`,
  bookTrip,
  tripId,
  shouldFail,
);

console.log("=== Result ===");
console.log(JSON.stringify(result, null, 2));
