import { pipe } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { getValueFrom } from '../utils/getValueFrom';

import type { OperatorFunction } from 'rxjs';

/**
 * Type helper to extract nested property types using dot notation.
 * Supports up to 4 levels of nesting.
 *
 * @example
 * type Example = { a: { b: { c: string } } }
 * type Result = PathValue<Example, 'a.b.c'> // string
 */
type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? PathValue<T[Key], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Usage:
// source$.pipe(
//   isEvent(
//     (event) => event.type === 'call.started',
//     (event) => ({ id: event.id, timestamp: event.timestamp })
//   )
// );

/**
 * RxJS operator that filters events based on a predicate and maps matching events.
 *
 * This operator combines filter and map operations:
 * 1. Only events that match the predicate are emitted
 * 2. Matching events are transformed using the map function
 *
 * @template TInput - The type of input events
 * @template TOutput - The type of output after mapping
 * @param predicate - Function to test each event. Returns true to include the event.
 * @param mapFn - Function to transform matching events
 * @returns An operator function that filters and maps events
 *
 * @example
 * ```typescript
 * interface CallEvent {
 *   type: 'call.started' | 'call.ended';
 *   id: string;
 *   timestamp: number;
 * }
 *
 * events$.pipe(
 *   isEvent(
 *     (event: CallEvent) => event.type === 'call.started',
 *     (event: CallEvent) => ({ id: event.id, timestamp: event.timestamp })
 *   )
 * ).subscribe(startEvent => {
 *   console.log('Call started:', startEvent);
 * });
 * ```
 */
export function ifIsMap<TInput, TOutput>(
  predicate: (event: unknown) => event is TInput,
  mapFn: (event: TInput) => TOutput
): OperatorFunction<unknown, TOutput> {
  return pipe(filter(predicate), map(mapFn));
}

/**
 * Generic RxJS operator that filters events using a type guard and extracts a property.
 *
 * This is the generic version that works with any type, not just JSONRPCRequest.
 * Use this when you need to filter and extract properties from already-narrowed types.
 *
 * **Type inference**: The output type is automatically inferred from the input type and path!
 *
 * @template TInput - The type to narrow to (via type guard)
 * @template TPath - The dot-notation path to extract (inferred from parameter)
 * @param predicate - Type guard function to filter events
 * @param resultPath - Dot-notation path to extract (e.g., 'params', 'params.data')
 * @returns An operator function that filters and extracts
 *
 * @example
 * ```typescript
 * interface EventParams {
 *   event_type: string;
 *   data: { value: number };
 * }
 *
 * const isAuthEvent = (e: unknown): e is EventParams =>
 *   typeof e === 'object' && e !== null && 'event_type' in e;
 *
 * // Type of 'data' is automatically inferred as { value: number }
 * params$.pipe(
 *   filterAs(isAuthEvent, 'data')
 * ).subscribe(data => {
 *   console.log('Event data:', data.value); // TypeScript knows about .value!
 * });
 *
 * // Deeply nested properties are also inferred
 * params$.pipe(
 *   filterAs(isAuthEvent, 'data.value')
 * ).subscribe(value => {
 *   console.log(value); // Type is 'number'
 * });
 * ```
 */
export function filterAs<TInput, TPath extends string>(
  predicate: (event: unknown) => event is TInput,
  resultPath: TPath
): OperatorFunction<unknown, PathValue<TInput, TPath>> {
  return pipe(
    ifIsMap(predicate, (event) => {
      const result = getValueFrom<PathValue<TInput, TPath>>(event, resultPath);
      return result;
    }),
    filter((value): value is PathValue<TInput, TPath> => value !== undefined)
  );
}
