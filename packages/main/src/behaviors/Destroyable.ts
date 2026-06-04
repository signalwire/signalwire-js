import { Subject, ReplaySubject, BehaviorSubject, observeOn, asapScheduler } from 'rxjs';

import type { Observable, Subscription, Observer } from 'rxjs';

export abstract class Destroyable {
  protected subscriptions: Subscription[] = [];
  protected subjects: Subject<unknown>[] = [];
  protected _destroyed$ = new Subject<void>();
  private _observableCache?: Map<string, Observable<unknown>>;

  public destroy(): void {
    this._observableCache?.clear();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subjects.forEach((subject) => subject.complete());
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  protected cachedObservable<T>(key: string, factory: () => Observable<T>): Observable<T> {
    this._observableCache ??= new Map();
    let cached = this._observableCache.get(key) as Observable<T> | undefined;
    if (!cached) {
      cached = factory();
      this._observableCache.set(key, cached as Observable<unknown>);
    }
    return cached;
  }

  /**
   * Like `cachedObservable`, but defers emissions to the microtask queue
   * via `observeOn(asapScheduler)`.
   *
   * Use ONLY for public-facing observable getters that external consumers
   * subscribe to. Prevents a class of bugs where `BehaviorSubject` or
   * `ReplaySubject` replays synchronously during `subscribe()`, before
   * the subscription variable is assigned in the caller's scope.
   *
   * Do NOT use for observables consumed internally by the SDK — internal
   * code using `subscribeTo()`, `firstValueFrom()`, or `withLatestFrom()`
   * depends on synchronous emission delivery.
   */
  protected publicCachedObservable<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const publicKey = `public:${key}`;
    this._observableCache ??= new Map();
    let cached = this._observableCache.get(publicKey) as Observable<T> | undefined;
    if (!cached) {
      cached = factory().pipe(observeOn(asapScheduler));
      this._observableCache.set(publicKey, cached as Observable<unknown>);
    }
    return cached;
  }

  /**
   * Wraps an observable so emissions are deferred to the microtask queue.
   *
   * Use ONLY for public-facing getters that expose a subject via
   * `.asObservable()` without going through `cachedObservable`.
   *
   * Do NOT use for observables consumed internally by the SDK.
   */
  protected deferEmission<T>(observable: Observable<T>): Observable<T> {
    return observable.pipe(observeOn(asapScheduler));
  }

  protected subscribeTo<T>(
    observable: Observable<T>,
    observerOrNext: Partial<Observer<T>> | ((value: T) => void) | undefined
  ): void {
    const subscription = observable.subscribe(observerOrNext);
    this.subscriptions.push(subscription);
  }

  protected createSubject<T>(): Subject<T> {
    const subject = new Subject<T>();
    this.subjects.push(subject as Subject<unknown>);
    return subject;
  }

  protected createReplaySubject<T>(bufferSize?: number, windowTime?: number): ReplaySubject<T> {
    const subject = new ReplaySubject<T>(bufferSize, windowTime);
    this.subjects.push(subject as Subject<unknown>);
    return subject;
  }

  protected createBehaviorSubject<T>(initialValue: T): BehaviorSubject<T> {
    const subject = new BehaviorSubject<T>(initialValue);
    this.subjects.push(subject as Subject<unknown>);
    return subject;
  }

  /**
   * Observable that emits when the instance is destroyed
   */
  public get destroyed$(): Observable<void> {
    return this._destroyed$.asObservable();
  }
}
