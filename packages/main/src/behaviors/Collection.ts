import {
  defer,
  distinctUntilChanged,
  filter,
  from,
  map,
  ReplaySubject,
  shareReplay,
  switchMap,
  takeUntil,
  skip,
  pipe
} from 'rxjs';

import { Destroyable } from './Destroyable';
import { GET_PARAMS } from '../controllers/HTTPRequestController';
import { CollectionFetchError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type {
  PaginatedResponse,
  Entity,
  FetchController,
  Collection
} from './types/collection.types';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { Observable } from 'rxjs';

const logger = getLogger();

export class Fetcher<T extends Entity = Entity> implements FetchController<Entity> {
  private nextUrl?: string;
  public hasMore: boolean | undefined;
  public filter = (_item: Entity): _item is T => true;
  public mapper = (item: unknown): T => item as T;

  constructor(
    protected endpoint: string,
    params: string,
    protected http: HTTPRequestController
  ) {
    this.nextUrl = `${this.endpoint}?${params}`;
  }

  public async next(): Promise<T[]> {
    if (!this.nextUrl) {
      this.hasMore = false;
      return [];
    }

    const response = await this.http.request({
      ...GET_PARAMS,
      url: this.nextUrl
    });
    if (response.ok && !!response.body) {
      const result = JSON.parse(response.body) as PaginatedResponse<T>;
      this.nextUrl = result.links.next;
      this.hasMore = !!this.nextUrl;
      const filtered = result.data.filter(this.filter);
      return filtered.map(this.mapper);
    }
    logger.error('Failed to fetch entity');
    return [];
  }

  public async id(v: unknown): Promise<T | undefined> {
    const response = await this.http.request({
      ...GET_PARAMS,
      url: `${this.endpoint}/${String(v)}`
    });
    if (response.ok && !!response.body) {
      return JSON.parse(response.body) as T;
    }
  }
}

export class EntityCollection<T extends Entity = Entity>
  extends Destroyable
  implements Collection<T>
{
  public hasMore$: Observable<boolean>;
  private collectionData = new Map<string, T>();
  private observablesRegistry = new Map<string, ReplaySubject<T>>();
  private upsertData = (data: Partial<T>) => {
    if (!data.id) return;
    const existing = this.collectionData.get(data.id) ?? {};
    const updated = {} as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(existing), ...Object.keys(data)]);
    for (const key of allKeys) {
      const existingVal = (existing as Record<string, unknown>)[key];
      const newVal = (data as Record<string, unknown>)[key];
      if (
        newVal !== undefined &&
        existingVal !== undefined &&
        typeof existingVal === 'object' &&
        existingVal !== null &&
        !Array.isArray(existingVal) &&
        typeof newVal === 'object' &&
        newVal !== null &&
        !Array.isArray(newVal)
      ) {
        updated[key] = { ...existingVal, ...newVal };
      } else if (newVal !== undefined) {
        updated[key] = newVal;
      } else {
        updated[key] = existingVal;
      }
    }
    this.collectionData.set(data.id, updated as T);
    this.observablesRegistry.get(data.id)?.next(updated as T);
    this._values$.next(Array.from(this.collectionData.values()));
  };
  private _loading$ = this.createBehaviorSubject<boolean>(false);
  private _values$ = this.createReplaySubject<T[]>(1);
  private _hasMore$ = this.createBehaviorSubject<boolean>(true);

  constructor(
    private fetchController: FetchController<T>,
    private update$: Observable<Partial<T>>,
    private readonly onError?: (error: Error) => void
  ) {
    super();
    this.subscribeTo(this.update$, this.upsertData);
    this.hasMore$ = defer(() => from(this.init())).pipe(
      switchMap(() => this._hasMore$),
      distinctUntilChanged(),
      shareReplay(1),
      takeUntil(this.destroyed$)
    );
  }

  public get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  public get loading(): boolean {
    return this._loading$.value;
  }

  public get values$(): Observable<T[]> {
    return this._values$.asObservable();
  }

  public get hasMore(): boolean {
    return this.fetchController.hasMore ?? true;
  }

  public get updated$(): Observable<void> {
    return this.cachedObservable('updated$', () =>
      this._loading$.pipe(
        distinctUntilChanged(),
        skip(1), // skipping the loading === true event
        filter((loading) => !loading),
        map(() => void 0),
        takeUntil(this.destroyed$)
      )
    );
  }

  public get values(): T[] {
    return Array.from(this.collectionData.values());
  }

  private async init(): Promise<void> {
    if (this.fetchController.hasMore === false) {
      this._hasMore$.next(false);
      return;
    }
    await this.fetchMore();
  }

  private async fetchMore(): Promise<void> {
    try {
      this._loading$.next(true);
      const datas = await this.fetchController.next();
      datas.forEach(this.upsertData);
      this._hasMore$.next(this.fetchController.hasMore ?? false);
      this._loading$.next(false);
    } catch (error) {
      logger.error(`Failed to fetch initial collection data`, error);
      this._hasMore$.next(this.fetchController.hasMore ?? false);
      this._loading$.next(false);
      this.onError?.(new CollectionFetchError('fetchMore', error));
    }
  }

  private async tryFetch(key: keyof FetchController<T>, value: unknown): Promise<T | undefined> {
    try {
      this._loading$.next(true);
      const data = await this.fetchController[key]?.(value);
      this._loading$.next(false);
      if (data) {
        this.upsertData(data);
      }
      return data;
    } catch (error) {
      logger.error(`Failed to fetch data for (${String(key)}:${String(value)}) :`, error);
      this._loading$.next(false);
      this.onError?.(new CollectionFetchError(`tryFetch(${String(key)})`, error));
    }
  }

  public get$(id: string): Observable<T> | undefined {
    if (!this.observablesRegistry.has(id)) {
      this.observablesRegistry.set(id, new ReplaySubject<T>(1));
      const data = this.collectionData.get(id);
      if (data) {
        this.observablesRegistry.get(id)?.next(data);
      } else {
        void this.tryFetch('id', id);
      }
    }
    return this.observablesRegistry.get(id)?.asObservable();
  }

  public async find$(key: keyof T, value: unknown): Promise<Observable<T> | undefined> {
    const data =
      Array.from(this.collectionData.values()).find((item) => item[key] === value) ??
      (await this.tryFetch(key, value));

    return data ? this.get$(data.id) : undefined;
  }

  public loadMore(): void {
    if (this.fetchController.hasMore !== false) {
      void this.fetchMore();
    }
  }

  public override destroy(): void {
    this.observablesRegistry.forEach((subject) => subject.complete());
    this.observablesRegistry.clear();
    super.destroy();
  }
}

export class EntityCollectionTransformed<
  O extends Entity = Entity,
  T extends Entity = Entity
> implements Collection<T> {
  private _values$?: Observable<T[]>;

  constructor(
    private originalCollection: EntityCollection<O>,
    private filter: (i: unknown) => i is O = (i): i is O => !!i,
    private mapper: (item: O) => T = (item) => item as unknown as T
  ) {}

  public get loading$(): Observable<boolean> {
    return this.originalCollection.loading$;
  }

  public get loading(): boolean {
    return this.originalCollection.loading;
  }
  public get hasMore$(): Observable<boolean> {
    return this.originalCollection.hasMore$;
  }
  public get hasMore(): boolean {
    return this.originalCollection.hasMore;
  }
  public get values(): T[] {
    return this.originalCollection.values.filter(this.filter).map(this.mapper);
  }
  public get values$(): Observable<T[]> {
    return (this._values$ ??= this.originalCollection.values$.pipe(
      map((values) => values.filter(this.filter).map(this.mapper))
    ));
  }

  public get$(id: string): Observable<T> | undefined {
    const original$ = this.originalCollection.get$(id);
    return !original$ ? original$ : original$.pipe(pipe(filter(this.filter), map(this.mapper)));
  }

  public async find$(key: keyof T, value: unknown): Promise<Observable<T> | undefined> {
    const original$ = await this.originalCollection.find$(key as keyof O, value);
    return !original$ ? original$ : original$.pipe(pipe(filter(this.filter), map(this.mapper)));
  }
  public loadMore(): void {
    this.originalCollection.loadMore();
  }
  public destroy(): void {
    this.originalCollection.destroy();
  }
}
