import { useState, useEffect } from 'react';
import type { Observable } from 'rxjs';

/**
 * React hook that subscribes to an RxJS Observable and returns its latest value.
 *
 * This is the recommended pattern for integrating @signalwire/js observables
 * with React components. The SDK exposes all state as RxJS observables
 * (e.g., call.status$, client.isConnected$), and this hook bridges them
 * into React's reactive model.
 *
 * @param observable$ - The RxJS observable to subscribe to (may be undefined)
 * @param initialValue - Initial value before the first emission
 * @returns The latest emitted value
 *
 * @example
 * // Subscribe to call status
 * const status = useObservable(call?.status$, 'new');
 *
 * // Subscribe to connection state
 * const isConnected = useObservable(client.isConnected$, false);
 *
 * // Subscribe to participants list
 * const participants = useObservable(call?.participants$, []);
 */
export function useObservable<T>(observable$: Observable<T> | undefined, initialValue: T): T {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!observable$) {
      setValue(initialValue);
      return;
    }

    const subscription = observable$.subscribe((next) => setValue(next));
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observable$]);

  return value;
}
