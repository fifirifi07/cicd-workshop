import type { RequestHandler } from 'express';

/**
 * Simulated backend latency.
 *
 * Without it the API answers in a fraction of a millisecond, because the whole catalogue
 * lives in process memory. No real shop behaves that way: a request that reaches a database
 * over a network costs tens to hundreds of milliseconds, and the interface shows a loading
 * state while it waits.
 *
 * This matters beyond realism. A test suite that finishes in seconds cannot demonstrate
 * anything about parallelism or sharding - the fixed cost of starting a CI job dominates
 * it completely. Latency here is what makes those measurements meaningful.
 *
 * Tune with `API_LATENCY_MS`; set it to `0` to switch the delay off entirely.
 */
// 150 ms measured against the suite: it puts the UI run at ~2.3 min on a single worker,
// which is long enough for parallelism and sharding to produce a visible difference,
// and still within what a real API backed by a database would cost.
const DEFAULT_LATENCY_MS = 150;

export function configuredLatency(): number {
  const raw = process.env.API_LATENCY_MS;
  if (raw === undefined) return DEFAULT_LATENCY_MS;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LATENCY_MS;
}

/**
 * Delays a response by `base * weight` milliseconds.
 *
 * The weight exists because not every endpoint costs the same: listing the catalogue filters
 * and sorts a collection, while reading a single record by id is a lookup. Giving the
 * expensive endpoint a higher weight keeps the simulation honest rather than uniform.
 */
export function latency(weight = 1): RequestHandler {
  return (_req, _res, next) => {
    const delay = Math.round(configuredLatency() * weight);
    if (delay <= 0) {
      next();
      return;
    }
    // Wrapped in an arrow function on purpose: `NextFunction` has overloads with required
    // parameters, so passing it to `setTimeout` directly does not type-check.
    setTimeout(() => next(), delay);
  };
}
