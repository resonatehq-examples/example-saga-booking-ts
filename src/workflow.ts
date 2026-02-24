import type { Context } from "@resonatehq/sdk";
import {
  bookFlight,
  cancelFlight,
  bookHotel,
  cancelHotel,
  bookCarRental,
} from "./services";

// A retry policy that executes once and does not retry on failure.
// Use this for external service calls in a saga where retries would
// mask failures that need to trigger compensation instead.
const noRetry = {
  next: (attempt: number) => (attempt === 0 ? 0 : null),
  encode: () => ({ type: "never", data: {} }),
};

// ---------------------------------------------------------------------------
// Trip Booking Saga
// ---------------------------------------------------------------------------
// Books a flight, hotel, and car rental. If any step fails, previously
// completed bookings are cancelled in reverse order (compensation).
//
// This is the saga pattern — and with Resonate, it's just a generator
// function with try/catch. Each `yield* ctx.run()` is a durable checkpoint.
// If the process crashes mid-booking, it resumes from the last checkpoint.
// If it crashes mid-compensation, it resumes compensating.
//
// No saga framework. No compensation tables. No state machines.
// Just sequential code that happens to be crash-proof.

export interface BookingResult {
  status: "success" | "failed";
  tripId: string;
  flightId?: string;
  hotelId?: string;
  carId?: string;
  error?: string;
  compensated?: string[];
}

export function* bookTrip(
  ctx: Context,
  tripId: string,
  shouldFail: boolean,
): Generator<any, BookingResult, any> {
  // Note: code outside ctx.run() re-executes on replay.
  // All user-visible output lives inside the service functions (which are
  // wrapped in ctx.run) or in the entry point that reads the result.

  let flightId: string | undefined;
  let hotelId: string | undefined;

  try {
    // Step 1: Book flight
    flightId = yield* ctx.run(bookFlight, tripId);

    // Step 2: Book hotel
    hotelId = yield* ctx.run(bookHotel, tripId);

    // Step 3: Book car rental (this may fail)
    // noRetry ensures failure propagates immediately to trigger compensation
    // rather than retrying indefinitely with exponential backoff.
    const carId = yield* ctx.run(
      bookCarRental,
      tripId,
      shouldFail,
      ctx.options({ retryPolicy: noRetry }),
    );

    return { status: "success", tripId, flightId, hotelId, carId };
  } catch (error) {
    const message = (error as Error).message;
    const compensated: string[] = [];

    // Compensate in reverse order — each compensation is also durable
    if (hotelId) {
      yield* ctx.run(cancelHotel, tripId, hotelId);
      compensated.push("hotel");
    }

    if (flightId) {
      yield* ctx.run(cancelFlight, tripId, flightId);
      compensated.push("flight");
    }

    return { status: "failed", tripId, error: message, compensated };
  }
}
