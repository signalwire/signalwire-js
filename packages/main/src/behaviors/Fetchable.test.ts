import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Fetchable } from './Fetchable';
import { firstValueFrom } from 'rxjs';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';

// Mock the core module to avoid circular dependencies
vi.mock('./index', () => ({}));

interface TestData {
  id: string;
  name: string;
  value: number;
}

class TestFetchable extends Fetchable<TestData> {
  public id?: string;
  public name?: string;
  public value?: number;

  protected populateInstance(data: TestData): void {
    this.id = data.id;
    this.name = data.name;
    this.value = data.value;
  }
}

describe('Fetchable', () => {
  let mockHttp: HTTPRequestController;

  beforeEach(() => {
    mockHttp = {
      request: vi.fn()
    } as unknown as HTTPRequestController;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with correct fromPath', () => {
      const fetchable = new TestFetchable('/api/test', mockHttp);
      expect(fetchable.fromPath).toBe('/api/test');
    });

    it('should create fetched$ observable', () => {
      const fetchable = new TestFetchable('/api/test', mockHttp);
      expect(fetchable.fetched$).toBeDefined();
    });

    it('should not fetch immediately on construction', () => {
      new TestFetchable('/api/test', mockHttp);
      expect(mockHttp.request).not.toHaveBeenCalled();
    });
  });

  describe('fetch - Happy path', () => {
    it('should fetch and populate instance on subscription', async () => {
      const testData: TestData = {
        id: 'test-123',
        name: 'Test Item',
        value: 42
      };

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify(testData),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(true);
      expect(mockHttp.request).toHaveBeenCalledTimes(1);
      expect(mockHttp.request).toHaveBeenCalledWith({
        url: '/api/test',
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      expect(fetchable.id).toBe('test-123');
      expect(fetchable.name).toBe('Test Item');
      expect(fetchable.value).toBe(42);
    });

    it('should call populateInstance with correct data', async () => {
      const testData: TestData = {
        id: 'populate-test',
        name: 'Populate Test',
        value: 100
      };

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify(testData),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const populateSpy = vi.spyOn(fetchable as any, 'populateInstance');

      await firstValueFrom(fetchable.fetched$);

      expect(populateSpy).toHaveBeenCalledTimes(1);
      expect(populateSpy).toHaveBeenCalledWith(testData);
    });

    it('should use shareReplay to cache result', async () => {
      const testData: TestData = {
        id: 'cache-test',
        name: 'Cache Test',
        value: 99
      };

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify(testData),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);

      // Subscribe multiple times
      const result1 = await firstValueFrom(fetchable.fetched$);
      const result2 = await firstValueFrom(fetchable.fetched$);
      const result3 = await firstValueFrom(fetchable.fetched$);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      // Should only call HTTP once due to shareReplay
      expect(mockHttp.request).toHaveBeenCalledTimes(1);
    });

    it('should handle successful response with complex nested data', async () => {
      interface ComplexData {
        id: string;
        nested: {
          items: Array<{ id: number; name: string }>;
          metadata: Record<string, unknown>;
        };
      }

      class ComplexFetchable extends Fetchable<ComplexData> {
        public data?: ComplexData;

        protected populateInstance(data: ComplexData): void {
          this.data = data;
        }
      }

      const complexData: ComplexData = {
        id: 'complex-123',
        nested: {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ],
          metadata: {
            count: 2,
            timestamp: '2024-01-01T00:00:00Z'
          }
        }
      };

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify(complexData),
        status: 200,
        headers: {}
      });

      const fetchable = new ComplexFetchable('/api/complex', mockHttp);
      await firstValueFrom(fetchable.fetched$);

      expect(fetchable.data).toEqual(complexData);
    });
  });

  describe('fetch - Error handling', () => {
    it('should return false when response is not ok', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: false,
        body: JSON.stringify({ error: 'Not found' }),
        status: 404,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
      expect(fetchable.id).toBeUndefined();
      expect(fetchable.name).toBeUndefined();
      expect(fetchable.value).toBeUndefined();
    });

    it('should return false when response body is null', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: null,
        status: 204,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });

    it('should return false when response body is undefined', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: undefined,
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });

    it('should handle HTTP request errors', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttp.request).mockRejectedValue(error);

      const fetchable = new TestFetchable('/api/test', mockHttp);

      await expect(firstValueFrom(fetchable.fetched$)).rejects.toThrow('Network error');
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: 'invalid json {',
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);

      await expect(firstValueFrom(fetchable.fetched$)).rejects.toThrow();
    });

    it('should handle malformed JSON', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: '{"unclosed": "object"',
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);

      await expect(firstValueFrom(fetchable.fetched$)).rejects.toThrow();
    });
  });

  describe('HTTP request configuration', () => {
    it('should make GET request to correct URL', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
        status: 200,
        headers: {}
      });

      const customPath = '/api/custom/endpoint';
      const fetchable = new TestFetchable(customPath, mockHttp);
      await firstValueFrom(fetchable.fetched$);

      expect(mockHttp.request).toHaveBeenCalledWith({
        url: customPath,
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
    });

    it('should work with different endpoint paths', async () => {
      const paths = [
        '/api/v1/resource',
        '/api/v2/resource',
        '/custom/path',
        '/deeply/nested/api/endpoint'
      ];

      for (const path of paths) {
        vi.clearAllMocks();
        vi.mocked(mockHttp.request).mockResolvedValue({
          ok: true,
          body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
          status: 200,
          headers: {}
        });

        const fetchable = new TestFetchable(path, mockHttp);
        await firstValueFrom(fetchable.fetched$);

        expect(mockHttp.request).toHaveBeenCalledWith({
          url: path,
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });
      }
    });
  });

  describe('Response status codes', () => {
    it('should handle 200 OK response', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(true);
    });

    it('should handle 404 Not Found response', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: false,
        body: JSON.stringify({ error: 'Not found' }),
        status: 404,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });

    it('should handle 500 Internal Server Error response', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: false,
        body: JSON.stringify({ error: 'Internal server error' }),
        status: 500,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });

    it('should handle 401 Unauthorized response', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: false,
        body: JSON.stringify({ error: 'Unauthorized' }),
        status: 401,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });

    it('should handle 403 Forbidden response', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: false,
        body: JSON.stringify({ error: 'Forbidden' }),
        status: 403,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response body with ok status', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: '',
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);

      // Empty body will fail JSON.parse which will throw, but if the implementation
      // returns false instead, we should test for that
      const result = await firstValueFrom(fetchable.fetched$).catch(() => false);
      expect(result).toBe(false);
    });

    it('should handle response with extra fields not in type', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({
          id: '1',
          name: 'test',
          value: 1,
          extraField: 'unexpected',
          anotherField: 42
        }),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(true);
      expect(fetchable.id).toBe('1');
      expect(fetchable.name).toBe('test');
      expect(fetchable.value).toBe(1);
    });

    it('should handle response with null values', async () => {
      interface NullableData {
        id: string;
        name: string | null;
        value: number | null;
      }

      class NullableFetchable extends Fetchable<NullableData> {
        public id?: string;
        public name?: string | null;
        public value?: number | null;

        protected populateInstance(data: NullableData): void {
          this.id = data.id;
          this.name = data.name;
          this.value = data.value;
        }
      }

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({
          id: 'null-test',
          name: null,
          value: null
        }),
        status: 200,
        headers: {}
      });

      const fetchable = new NullableFetchable('/api/test', mockHttp);
      await firstValueFrom(fetchable.fetched$);

      expect(fetchable.id).toBe('null-test');
      expect(fetchable.name).toBeNull();
      expect(fetchable.value).toBeNull();
    });

    it('should handle large JSON responses', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        value: i
      }));

      interface LargeData {
        items: Array<{ id: string; value: number }>;
      }

      class LargeFetchable extends Fetchable<LargeData> {
        public items?: Array<{ id: string; value: number }>;

        protected populateInstance(data: LargeData): void {
          this.items = data.items;
        }
      }

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({ items: largeArray }),
        status: 200,
        headers: {}
      });

      const fetchable = new LargeFetchable('/api/test', mockHttp);
      const result = await firstValueFrom(fetchable.fetched$);

      expect(result).toBe(true);
      expect(fetchable.items).toHaveLength(1000);
      expect(fetchable.items?.[0]).toEqual({ id: 'item-0', value: 0 });
      expect(fetchable.items?.[999]).toEqual({ id: 'item-999', value: 999 });
    });
  });

  describe('Observable behavior', () => {
    it('should complete the observable after fetching', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);
      let completed = false;

      fetchable.fetched$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      await firstValueFrom(fetchable.fetched$);

      // Give a small delay for completion callback
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(completed).toBe(true);
    });

    it('should clean up on destroy', async () => {
      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
        status: 200,
        headers: {}
      });

      const fetchable = new TestFetchable('/api/test', mockHttp);

      // First subscribe and complete the request
      await firstValueFrom(fetchable.fetched$);

      // Now destroy
      fetchable.destroy();

      // Due to shareReplay, the cached value will still be emitted to new subscribers
      // This is expected behavior - shareReplay caches the last value
      // The takeUntil(destroyed$) prevents NEW emissions after destroy, but doesn't
      // stop the shareReplay cache from replaying
      let emittedAfterDestroy = false;
      const lateSubscription = fetchable.fetched$.subscribe({
        next: () => {
          emittedAfterDestroy = true;
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // With shareReplay, the cached value is still emitted
      expect(emittedAfterDestroy).toBe(true);

      lateSubscription.unsubscribe();
    });
  });

  describe('Type safety', () => {
    it('should maintain type information through generic parameter', async () => {
      interface TypedData {
        stringField: string;
        numberField: number;
        booleanField: boolean;
        arrayField: string[];
      }

      class TypedFetchable extends Fetchable<TypedData> {
        public data?: TypedData;

        protected populateInstance(data: TypedData): void {
          this.data = data;
        }
      }

      const typedData: TypedData = {
        stringField: 'test',
        numberField: 42,
        booleanField: true,
        arrayField: ['a', 'b', 'c']
      };

      vi.mocked(mockHttp.request).mockResolvedValue({
        ok: true,
        body: JSON.stringify(typedData),
        status: 200,
        headers: {}
      });

      const fetchable = new TypedFetchable('/api/test', mockHttp);
      await firstValueFrom(fetchable.fetched$);

      expect(fetchable.data).toEqual(typedData);
      expect(typeof fetchable.data?.stringField).toBe('string');
      expect(typeof fetchable.data?.numberField).toBe('number');
      expect(typeof fetchable.data?.booleanField).toBe('boolean');
      expect(Array.isArray(fetchable.data?.arrayField)).toBe(true);
    });
  });

  describe('Integration with Destroyable', () => {
    it('should extend Destroyable', () => {
      const fetchable = new TestFetchable('/api/test', mockHttp);
      expect(fetchable).toHaveProperty('destroy');
      expect(fetchable).toHaveProperty('destroyed$');
    });

    it('should stop fetching when destroyed', async () => {
      vi.mocked(mockHttp.request).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                body: JSON.stringify({ id: '1', name: 'test', value: 1 }),
                status: 200,
                headers: {}
              });
            }, 100);
          })
      );

      const fetchable = new TestFetchable('/api/test', mockHttp);

      let emitted = false;
      let errored = false;

      fetchable.fetched$.subscribe({
        next: () => {
          emitted = true;
        },
        error: () => {
          errored = true;
        }
      });

      // Destroy immediately
      fetchable.destroy();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(emitted).toBe(false);
      expect(errored).toBe(false);
    });
  });
});
