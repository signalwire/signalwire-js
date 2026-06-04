import type { Observable } from 'rxjs';

/**
 * Provider interface for resolving addresses by ID
 *
 * This interface breaks the circular dependency between Address and Directory
 * by providing a minimal contract that Address needs from the Directory.
 *
 * @template TAddress - The Address type, defaults to never to enforce explicit typing
 *
 * @remarks
 * Uses a generic type parameter to maintain type safety while avoiding
 * circular dependencies. Implementations should provide the concrete Address type.
 */
export interface AddressProvider<TAddress = never> {
  /**
   * Get an observable stream for a specific address by ID
   *
   * @param id - The address ID to retrieve
   * @returns Observable of the address, or undefined if not found
   */
  get$(id: string): Observable<TAddress> | undefined;
}
