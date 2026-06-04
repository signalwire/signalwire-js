import { filter } from 'rxjs';

import type { OperatorFunction } from 'rxjs';

/**
 * RxJS operator that filters out `null` and `undefined` values with type narrowing.
 *
 * @example
 * ```ts
 * source$.pipe(filterNull()).subscribe(value => {
 *   // value is guaranteed non-null
 * });
 * ```
 */
export function filterNull<T>(): OperatorFunction<T | null | undefined, T> {
  return filter((value): value is T => value != null);
}
