import { describe, it, expect, vi } from 'vitest';
import { Subject } from 'rxjs';

import { EntityCollection } from './Collection';

import type { Entity, FetchController } from './types/collection.types';

interface TestEntity extends Entity {
  id: string;
  name: string;
  meta?: { a?: number; b?: number };
}

const createMockFetchController = (items: TestEntity[] = []): FetchController<TestEntity> => ({
  hasMore: false,
  next: vi.fn().mockResolvedValue(items),
  id: vi.fn().mockResolvedValue(undefined)
});

describe('EntityCollection', () => {
  it('BUG: destroy() never calls super.destroy() — managed subjects are not completed', async () => {
    // Bug #1: Collection.ts:204 — destroy() overrides Destroyable.destroy() but
    // never calls super.destroy(). This means Destroyable's cleanup (completing
    // all managed subjects, unsubscribing all subscriptions, emitting destroyed$)
    // never happens.

    const update$ = new Subject<Partial<TestEntity>>();
    const fetchController = createMockFetchController([]);
    const collection = new EntityCollection<TestEntity>(fetchController, update$);

    // Wait for initialization
    await vi.waitFor(() => {
      expect(collection.loading).toBe(false);
    });

    // Subscribe to the destroyed$ observable to verify super.destroy() is called
    let destroyedEmitted = false;
    collection.destroyed$.subscribe(() => {
      destroyedEmitted = true;
    });

    // Subscribe to values$ to verify it gets completed (managed by Destroyable)
    let valuesCompleted = false;
    collection.values$.subscribe({
      complete: () => {
        valuesCompleted = true;
      }
    });

    collection.destroy();

    // If super.destroy() was called, destroyed$ would emit
    // Currently it does NOT because super.destroy() is never called
    expect(destroyedEmitted).toBe(true);

    // The values$ subject gets manually completed in destroy(), so this should be true
    // But the destroyed$ signal from Destroyable base class should also fire
    expect(valuesCompleted).toBe(true);
  });

  it('BUG: shallow merge in upsertData loses nested state', async () => {
    // Bug #12: Collection.ts:87 — upsertData uses spread operator { ...existing, ...data }
    // which is a shallow merge. Nested objects are replaced entirely instead of being
    // deep-merged. This means updating { meta: { a: 3 } } on an item with
    // { meta: { a: 1, b: 2 } } will lose the b property.
    //
    // We test this directly via the update$ subject (bypasses lazy init).

    const update$ = new Subject<Partial<TestEntity>>();
    const fetchController = createMockFetchController([]); // no initial items
    const collection = new EntityCollection<TestEntity>(fetchController, update$);

    // Insert an item with nested data via the update$ stream
    update$.next({ id: 'item-1', name: 'Test', meta: { a: 1, b: 2 } });

    // Verify initial state
    const initial = collection.values.find((v) => v.id === 'item-1');
    expect(initial?.meta).toEqual({ a: 1, b: 2 });

    // Now send a partial update that only changes meta.a
    update$.next({ id: 'item-1', meta: { a: 3 } });

    // The updated item should preserve meta.b
    const updated = collection.values.find((v) => v.id === 'item-1');
    // BUG: shallow spread replaces meta entirely, so meta.b is lost
    expect(updated?.meta?.b).toBe(2);
  });
});
