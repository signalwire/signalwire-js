import type { Address } from './Address';
import type { AddressProvider } from '../../interfaces/AddressProvider';
import type { Observable } from 'rxjs';

/**
 * Directory interface for managing addresses
 *
 * This is the public API contract for address directory functionality.
 * It provides access to addresses, loading capabilities, and search functionality.
 *
 * @public
 */
export interface Directory extends AddressProvider<Address> {
  /**
   * Observable stream of all addresses in the directory
   * Emits a new array whenever addresses are added, removed, or updated
   */
  readonly addresses$: Observable<Address[]>;

  /**
   * Current snapshot of all addresses in the directory
   */
  readonly addresses: Address[];

  /**
   * Observable indicating whether more addresses can be loaded from the server
   */
  readonly hasMore$: Observable<boolean>;

  /**
   * Observable indicating the current loading state
   * Emits `true` when loading, `false` when idle
   */
  readonly loading$: Observable<boolean>;

  readonly loading: boolean;

  /**
   * Load more addresses from the server
   * Only loads if `hasMore` is true
   */
  loadMore(): void;

  /**
   * Get a specific address by ID
   *
   * @param addressId - The address ID to retrieve
   * @returns The address instance, or undefined if not found
   */
  get(addressId: string): Address | undefined;

  /**
   * Find an address ID by searching for a name
   *
   * @param uri - The address name to search for
   * @returns Promise resolving to the address ID, or undefined if not found
   */
  findAddressIdByURI(uri: string): Promise<string | undefined>;
}
