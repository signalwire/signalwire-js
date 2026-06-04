// =============================================================================
// COLLECTION TYPES
// =============================================================================
// This file contains types extracted from Collection.ts for better organization.

import type { Observable } from 'rxjs';

// =============================================================================
// PAGINATED RESPONSE
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first?: string;
    self?: string;
    next?: string;
    prev?: string;
  };
}

// =============================================================================
// ENTITY
// =============================================================================

export interface Entity {
  id: string;
}

// =============================================================================
// FETCH CONTROLLER
// =============================================================================

export type FetchController<T extends Entity = Entity> = {
  [key in keyof Partial<T>]: (v?: unknown) => Promise<T | undefined>;
} & {
  next: () => Promise<T[]>;
  hasMore: boolean | undefined;
  filter?: (item: T) => item is T;
  mapper?: (item: unknown) => T;
};

// =============================================================================
// COLLECTION INTERFACE
// =============================================================================

export interface Collection<T extends Entity = Entity> {
  loading$: Observable<boolean>;
  loading: boolean;
  hasMore$: Observable<boolean>;
  hasMore: boolean;
  values: T[];
  values$: Observable<T[]>;
  get$(id: string): Observable<T> | undefined;
  find$(key: keyof T, value: unknown): Promise<Observable<T> | undefined>;
  loadMore(): void;
  destroy(): void;
}
