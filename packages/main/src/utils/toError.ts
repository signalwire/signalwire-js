/**
 * Normalizes an unknown caught value into a proper Error instance.
 *
 * In catch blocks, the caught value is `unknown` — it could be an Error,
 * string, number, or any other value. This utility ensures a consistent
 * Error object is produced.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(String(value));
}
