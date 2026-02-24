import type { Context } from "@resonatehq/sdk";

// ---------------------------------------------------------------------------
// Simulated external booking services
// ---------------------------------------------------------------------------
// Each function simulates an API call to an external service.
// The _ctx parameter is required by Resonate but unused here.
// In a real application, these would call actual APIs.

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// --- Flight Service -------------------------------------------------------

export async function bookFlight(
  _ctx: Context,
  tripId: string,
): Promise<string> {
  console.log(`  [flight]  Booking flight for trip ${tripId}...`);
  await sleep(300);
  const id = `FL-${randomId()}`;
  console.log(`  [flight]  Flight booked: ${id}`);
  return id;
}

export async function cancelFlight(
  _ctx: Context,
  _tripId: string,
  confirmationId: string,
): Promise<void> {
  console.log(`  [flight]  Cancelling flight ${confirmationId}...`);
  await sleep(200);
  console.log(`  [flight]  Flight cancelled: ${confirmationId}`);
}

// --- Hotel Service --------------------------------------------------------

export async function bookHotel(
  _ctx: Context,
  tripId: string,
): Promise<string> {
  console.log(`  [hotel]   Booking hotel for trip ${tripId}...`);
  await sleep(300);
  const id = `HT-${randomId()}`;
  console.log(`  [hotel]   Hotel booked: ${id}`);
  return id;
}

export async function cancelHotel(
  _ctx: Context,
  _tripId: string,
  confirmationId: string,
): Promise<void> {
  console.log(`  [hotel]   Cancelling hotel ${confirmationId}...`);
  await sleep(200);
  console.log(`  [hotel]   Hotel cancelled: ${confirmationId}`);
}

// --- Car Rental Service ---------------------------------------------------

export async function bookCarRental(
  _ctx: Context,
  tripId: string,
  shouldFail: boolean,
): Promise<string> {
  console.log(`  [car]     Booking car rental for trip ${tripId}...`);
  await sleep(300);

  if (shouldFail) {
    throw new Error("Car rental unavailable: no cars at this location");
  }

  const id = `CR-${randomId()}`;
  console.log(`  [car]     Car rental booked: ${id}`);
  return id;
}
