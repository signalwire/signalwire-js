import { distinctUntilChanged, Observable, Subject, takeUntil } from 'rxjs';

export interface OnChange<T> {
  onchange(callback: (newValue: T) => void): void;
}

class ObservableOnChange<T> implements OnChange<T> {
  private observable: Observable<T>;
  private destroy$ = new Subject<void>();

  constructor(observable: Observable<T>) {
    this.observable = observable;
  }

  onchange(callback: (newValue: T) => void): void {
    this.observable.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(callback);
  }

  public destroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

export type ToModelWithChangeable<T> = {
  [K in keyof T as K extends `${infer Name}$` ? Name : K]: T[K] extends Observable<infer V>
    ? OnChange<V>
    : T[K];
};

export function buildOnChangeProxy<T extends Record<string, unknown>>(
  model: T
): ToModelWithChangeable<T> {
  const cache = new Map<string | symbol, unknown>();

  return new Proxy(model, {
    get(target, prop) {
      const value = target[prop as keyof T] || target[`${String(prop)}$` as keyof T];

      // Handle functions (methods)
      if (typeof value === 'function') {
        if (prop === 'destroy') {
          return () => {
            // Clean up all cached changeables
            for (const cached of cache.values()) {
              if (cached instanceof ObservableOnChange) {
                cached.destroy();
              }
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            value.bind(target)();
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value.bind(target);
      }

      // Return cached changeable wrapper
      if (cache.has(prop)) {
        return cache.get(prop);
      }

      // Wrap observables
      if (value instanceof Observable) {
        const changeable = new ObservableOnChange(value);
        cache.set(prop, changeable);
        return changeable;
      }

      return value;
    }
  }) as ToModelWithChangeable<T>;
}
