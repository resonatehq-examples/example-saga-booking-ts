# Saga Pattern: Trip Booking

A trip booking workflow that demonstrates the **saga pattern** with automatic compensation. Books a flight, hotel, and car rental — if the car rental fails, it automatically cancels the hotel and flight in reverse order.

No saga framework. No compensation tables. Just a generator function with try/catch.

## What This Demonstrates

- **The saga pattern**: multi-step distributed transaction with rollback
- **Durable compensation**: each cancellation step is checkpointed — if the process crashes mid-compensation, it resumes where it left off
- **Crash recovery**: kill the process at any point and restart — it picks up from the last checkpoint
- **Selective retry policy**: fail-fast on the car rental to trigger compensation immediately

## Prerequisites

- [Bun](https://bun.sh) v1.0+

No external services required. Resonate runs in embedded mode.

## Setup

```bash
git clone https://github.com/resonatehq-examples/example-saga-booking-ts
cd example-saga-booking-ts
bun install
```

## Run It

**Happy path** — all bookings succeed:
```bash
bun start
```

```
=== Resonate Saga Pattern: Trip Booking ===
Mode: SUCCESS (all bookings will succeed)
  [flight]  Booking flight for trip trip-1234567890...
  [flight]  Flight booked: FL-ABC123
  [hotel]   Booking hotel for trip trip-1234567890...
  [hotel]   Hotel booked: HT-DEF456
  [car]     Booking car rental for trip trip-1234567890...
  [car]     Car rental booked: CR-GHI789

=== Result ===
{
  "status": "success",
  "tripId": "trip-1234567890",
  "flightId": "FL-ABC123",
  "hotelId": "HT-DEF456",
  "carId": "CR-GHI789"
}
```

**Failure path** — car rental fails, hotel and flight are cancelled:
```bash
bun start:fail
```

```
=== Resonate Saga Pattern: Trip Booking ===
Mode: FAILURE (car rental will fail, triggering compensation)
  [flight]  Booking flight for trip trip-1234567890...
  [flight]  Flight booked: FL-ABC123
  [hotel]   Booking hotel for trip trip-1234567890...
  [hotel]   Hotel booked: HT-DEF456
  [car]     Booking car rental for trip trip-1234567890...
  [hotel]   Cancelling hotel HT-DEF456...
  [hotel]   Hotel cancelled: HT-DEF456
  [flight]  Cancelling flight FL-ABC123...
  [flight]  Flight cancelled: FL-ABC123

=== Result ===
{
  "status": "failed",
  "tripId": "trip-1234567890",
  "error": "Car rental unavailable: no cars at this location",
  "compensated": ["hotel", "flight"]
}
```

## What to Observe

1. **Compensation runs in reverse order**: hotel cancels before flight (last-in, first-out)
2. **Each step is a checkpoint**: open `src/workflow.ts` and add `process.exit(1)` after any `yield*` — restart the process and it resumes from that point
3. **Crash mid-compensation**: if you crash during hotel cancellation, it will retry the hotel cancellation on restart (not restart the whole saga)

## The Code

The entire saga is 25 lines of business logic in [`src/workflow.ts`](src/workflow.ts):

```typescript
export function* bookTrip(ctx: Context, tripId: string, shouldFail: boolean) {
  let flightId: string | undefined;
  let hotelId: string | undefined;

  try {
    flightId = yield* ctx.run(bookFlight, tripId);
    hotelId  = yield* ctx.run(bookHotel, tripId);
    const carId = yield* ctx.run(bookCarRental, tripId, shouldFail,
                                  ctx.options({ retryPolicy: noRetry }));

    return { status: "success", tripId, flightId, hotelId, carId };
  } catch (error) {
    // Compensate in reverse order
    if (hotelId)  yield* ctx.run(cancelHotel, tripId, hotelId);
    if (flightId) yield* ctx.run(cancelFlight, tripId, flightId);

    return { status: "failed", tripId, error: (error as Error).message, compensated };
  }
}
```

Each `yield*` is a durable checkpoint. That's it.

## File Structure

```
example-saga-booking-ts/
├── src/
│   ├── index.ts       Entry point — Resonate setup and saga invocation
│   ├── workflow.ts    The saga: bookTrip with compensation logic
│   └── services.ts    Simulated booking APIs (flight, hotel, car rental)
├── package.json
└── tsconfig.json
```

**Lines of code**: ~200 total (including comments and blank lines), ~80 lines of actual logic. The `bookTrip` saga itself is 30 lines.

## Comparison

| | Resonate | Temporal | Restate |
|---|---|---|---|
| Core concept | Generator + try/catch | Workflow + Activities | Service + ctx.run |
| Saga logic (LOC) | ~25 | ~80 | ~60 |
| Total files | 3 source files | 6+ files (workflow, activities, worker, client, types, clients) | 4+ files |
| Concepts to learn | generators, `yield*`, `ctx.run` | workflows, activities, workers, task queues, activity proxies | services, `ctx.run`, `TerminalError` |
| Server required | No (embedded) | Yes (temporal server) | Yes (restate server) |

The saga pattern maps naturally to generator functions. `try/catch` is the compensation boundary. `yield*` is the checkpoint boundary. No framework needed — just the language.

## Learn More

- [Resonate documentation](https://docs.resonatehq.io)
- [Saga pattern skill](../agent-cortex/profiles/developer/skills/resonate-saga-pattern-typescript-SKILL.md)
- [Temporal saga example](https://github.com/temporalio/samples-typescript/tree/main/saga) — compare for yourself
- [Restate saga example](https://github.com/restatedev/examples/tree/main/typescript/patterns-use-cases/src/sagas) — compare for yourself
