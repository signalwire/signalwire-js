import { firstValueFrom, map, type Observable } from 'rxjs';

import { EntityCollection, Fetcher } from '../behaviors/Collection';
import { Destroyable } from '../behaviors/Destroyable';
import { GET_PARAMS } from '../controllers/HTTPRequestController';
import { Address } from '../core/entities/Address';
import { isConversationMessageUpdatedMetadata } from '../core/RPCMessages/guards/events.guards';
import { filterAs, filterNull } from '../operators';
import { isEmptyArray } from '../utils/arrays';
import { getLogger } from '../utils/logger';
import { warmup } from '../utils/warmup';

import type { ClientSessionManager } from './ClientSessionManager';
import type { PaginatedResponse } from '../behaviors/types/collection.types';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { Directory } from '../core/entities/Directory';
import type { GetAddressResponse } from '../core/types/address.types';
import type { ConversationsProvider } from '../interfaces/Conversations';

const logger = getLogger();

class AddressFetcher extends Fetcher<GetAddressResponse> {
  constructor(http: HTTPRequestController) {
    super('/api/fabric/addresses', 'sort_by=name&sort_order=asc', http);
  }

  async name(name: unknown): Promise<GetAddressResponse | undefined> {
    const response = await this.http.request({
      ...GET_PARAMS,
      url: `${this.endpoint}?name=${encodeURIComponent(name as string)}`
    });
    if (response.ok && !!response.body) {
      const result = JSON.parse(response.body) as PaginatedResponse<GetAddressResponse>;
      if (!isEmptyArray(result.data)) {
        return result.data[0];
      }
    }
    logger.error('Failed to fetch addresses');
  }
}

/** Collection of address states with reactive updates and pagination. */
export class AddressStateCollection extends EntityCollection<GetAddressResponse> {
  constructor(
    update$: Observable<Partial<GetAddressResponse>>,
    http: HTTPRequestController,
    onError?: (error: Error) => void
  ) {
    super(new AddressFetcher(http), update$, onError);
  }
}

/**
 * Manages the directory of {@link Address} entries with paginated loading.
 *
 * Implements the {@link Directory} interface and provides reactive access to
 * addresses via observables, along with pagination and lookup methods.
 */
export class DirectoryManager extends Destroyable implements Directory {
  private addNewAddress = (id: string): void => {
    const address = new Address(id, this.conversationManager, this);
    const observable = this._statesCollection.get$(id)?.pipe(
      filterNull(),
      map((data) => {
        address.upnext(data);
        return address;
      })
    );
    if (observable) {
      warmup(observable);
      this._observableRegistry.set(id, observable);
    }
    this._addressesInstances.set(id, address);
  };
  private _addresses$ = this.createBehaviorSubject<Address[]>([]);
  private _statesCollection: AddressStateCollection;
  private _addressesInstances = new Map<string, Address>();
  private _observableRegistry = new Map<string, Observable<Address>>();

  constructor(
    private http: HTTPRequestController,
    clientSession: ClientSessionManager,
    private conversationManager: ConversationsProvider,
    private readonly onError?: (error: Error) => void
  ) {
    super();
    this._statesCollection = new AddressStateCollection(
      clientSession.signalingEvent$.pipe(
        filterAs(isConversationMessageUpdatedMetadata, 'params'),
        // FIXME after Conversation API Fixes
        map((_) => ({}) as Partial<GetAddressResponse>)
      ),
      this.http,
      this.onError
    );
    this.initSubscriptions();
  }

  /** Whether addresses are currently being loaded from the server. */
  public get loading(): boolean {
    return this._statesCollection.loading;
  }

  private initSubscriptions(): void {
    this.subscribeTo(this._statesCollection.updated$, () => {
      const existing = Array.from(this._addressesInstances.values().map((address) => address.id));
      const newStates = this._statesCollection.values.filter(
        (state) => !existing.includes(state.id)
      );
      if (!isEmptyArray(newStates)) {
        newStates.forEach((state) => this.addNewAddress(state.id));
        this._addresses$.next(Array.from(this._addressesInstances.values()));
      }
    });
  }

  /** Observable stream of all addresses in the directory. */
  public get addresses$(): Observable<Address[]> {
    return this._addresses$.asObservable();
  }

  /** Current snapshot of all loaded addresses. */
  public get addresses(): Address[] {
    return this._addresses$.value;
  }

  /** Observable indicating whether more addresses can be loaded. */
  public get hasMore$(): Observable<boolean> {
    return this._statesCollection.hasMore$;
  }

  /** Observable of the current loading state. */
  public get loading$(): Observable<boolean> {
    return this._statesCollection.loading$;
  }

  /**
   * Loads the next page of addresses from the server.
   *
   * No-op if {@link hasMore$} is `false`. Loading state is observable via {@link loading$}.
   * New addresses are appended to {@link addresses$} when the page loads.
   */
  public loadMore(): void {
    if (this._statesCollection.hasMore) {
      this._statesCollection.loadMore();
    }
  }

  /**
   * Returns a reactive observable for a specific address by ID.
   * @param id - The address ID to observe.
   * @returns An observable of the address, or `undefined` if not found.
   */
  public get$(id: string): Observable<Address> | undefined {
    if (!this._observableRegistry.has(id)) {
      this.addNewAddress(id);
    }
    return this._observableRegistry.get(id);
  }

  /**
   * Returns an address by ID from the local cache.
   * @param addressId - The address ID to look up.
   * @returns The address, or `undefined` if not found.
   */
  public get(addressId: string): Address | undefined {
    return this._addressesInstances.get(addressId);
  }

  /**
   * Finds an address ID by its resource name (URI).
   *
   * Searches locally loaded addresses first, then queries the server if not found.
   * The resource name is the {@link Address.name} identifier, distinct from display name.
   *
   * @param name - The resource name to search for (exact match, e.g. `'/public/conference'`).
   * @returns The address ID, or `undefined` if no match is found locally or on server.
   */
  public async findAddressIdByURI(name: string): Promise<string | undefined> {
    let addressId = this._addressesInstances.values().find((addr) => addr.name === name)?.id;
    if (!addressId) {
      const found$ = await this._statesCollection.find$('name', name);
      if (found$) {
        const state = await firstValueFrom(found$);
        this.addNewAddress(state.id);
        addressId = state.id;
      }
    }
    return addressId;
  }
}
