import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageManager } from './StorageManager';
import {
  StorageNotAvailableError,
  SerializationError,
  StorageWriteError,
  DeserializationError,
  StorageReadError
} from '../core/errors';

// Mock Storage Interface for Testing
class MockStorage {
  private store: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// Sync Storage Implementation for testing sync/async compatibility
class SyncStorage {
  private store: Map<string, string> = new Map();

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

// Failing Storage for error testing
class FailingStorage {
  async setItem(_key: string, _value: string): Promise<void> {
    throw new Error('Storage is full');
  }

  async getItem(_key: string): Promise<string | null> {
    throw new Error('Storage read failed');
  }

  async removeItem(_key: string): Promise<void> {
    throw new Error('Storage delete failed');
  }
}

describe('StorageManager - Basic Operations', () => {
  let storageManager: StorageManager;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage as any);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('setItem', () => {
    it('should store a string value', async () => {
      await storageManager.setItem('test-key', 'test-value');
      const result = await storageManager.getItem<string>('test-key');
      expect(result).toBe('test-value');
    });

    it('should store a number value', async () => {
      await storageManager.setItem('number-key', 42);
      const result = await storageManager.getItem<number>('number-key');
      expect(result).toBe(42);
    });

    it('should store a boolean value', async () => {
      await storageManager.setItem('bool-key', true);
      const result = await storageManager.getItem<boolean>('bool-key');
      expect(result).toBe(true);
    });

    it('should store an object value', async () => {
      const obj = { name: 'John', age: 30 };
      await storageManager.setItem('obj-key', obj);
      const result = await storageManager.getItem<typeof obj>('obj-key');
      expect(result).toEqual(obj);
    });

    it('should store an array value', async () => {
      const arr = [1, 2, 3, 4, 5];
      await storageManager.setItem('arr-key', arr);
      const result = await storageManager.getItem<typeof arr>('arr-key');
      expect(result).toEqual(arr);
    });

    it('should store nested objects', async () => {
      const nested = {
        user: { name: 'Jane', address: { city: 'NYC', zip: '10001' } },
        preferences: { theme: 'dark', notifications: true }
      };
      await storageManager.setItem('nested-key', nested);
      const result = await storageManager.getItem<typeof nested>('nested-key');
      expect(result).toEqual(nested);
    });

    it('should store null value', async () => {
      await storageManager.setItem('null-key', null);
      const result = await storageManager.getItem('null-key');
      expect(result).toBe(null);
    });

    it('should store undefined as null', async () => {
      await storageManager.setItem('undefined-key', undefined);
      const result = await storageManager.getItem('undefined-key');
      expect(result).toBe(null);
    });

    it('should overwrite existing values', async () => {
      await storageManager.setItem('key', 'first');
      await storageManager.setItem('key', 'second');
      const result = await storageManager.getItem<string>('key');
      expect(result).toBe('second');
    });

    it('should serialize values to JSON strings', async () => {
      const obj = { test: 'value' };
      await storageManager.setItem('key', obj);
      // Check raw storage
      const raw = await mockStorage.getItem('key');
      expect(raw).toBe(JSON.stringify(obj));
    });
  });

  describe('getItem', () => {
    it('should return null for non-existent key', async () => {
      const result = await storageManager.getItem('non-existent');
      expect(result).toBe(null);
    });

    it('should retrieve stored values', async () => {
      const data = { id: 123, name: 'Test' };
      await storageManager.setItem('key', data);
      const result = await storageManager.getItem<typeof data>('key');
      expect(result).toEqual(data);
    });

    it('should handle type casting correctly', async () => {
      interface User {
        id: number;
        name: string;
      }
      const user: User = { id: 1, name: 'Alice' };
      await storageManager.setItem('user', user);
      const result = await storageManager.getItem<User>('user');
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Alice');
    });

    it('should return null when stored value is null', async () => {
      await storageManager.setItem('null-key', null);
      const result = await storageManager.getItem('null-key');
      expect(result).toBe(null);
    });

    it('should handle empty string values', async () => {
      await storageManager.setItem('empty', '');
      const result = await storageManager.getItem<string>('empty');
      expect(result).toBe('');
    });

    it('should handle zero values', async () => {
      await storageManager.setItem('zero', 0);
      const result = await storageManager.getItem<number>('zero');
      expect(result).toBe(0);
    });

    it('should handle false boolean values', async () => {
      await storageManager.setItem('false', false);
      const result = await storageManager.getItem<boolean>('false');
      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('should remove an existing item', async () => {
      await storageManager.setItem('key', 'value');
      await storageManager.removeItem('key');
      const result = await storageManager.getItem('key');
      expect(result).toBe(null);
    });

    it('should not throw error when removing non-existent key', async () => {
      await expect(storageManager.removeItem('non-existent')).resolves.not.toThrow();
    });

    it('should handle multiple removals of same key', async () => {
      await storageManager.setItem('key', 'value');
      await storageManager.removeItem('key');
      await storageManager.removeItem('key');
      const result = await storageManager.getItem('key');
      expect(result).toBe(null);
    });
  });
});

describe('StorageManager - Error Handling', () => {
  describe('JSON Parse Errors', () => {
    it('should throw DeserializationError for corrupted JSON data', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      // Manually insert corrupted JSON
      await mockStorage.setItem('corrupted', '{invalid json}');

      await expect(storageManager.getItem('corrupted')).rejects.toThrow(DeserializationError);
    });

    it('should throw DeserializationError for incomplete JSON', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      await mockStorage.setItem('incomplete', '{"name": "John"');

      await expect(storageManager.getItem('incomplete')).rejects.toThrow(DeserializationError);
    });

    it('should throw DeserializationError for plain text stored directly', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      // Store plain text without JSON encoding
      await mockStorage.setItem('plain', 'just a string');

      await expect(storageManager.getItem('plain')).rejects.toThrow(DeserializationError);
    });

    it('should return null for empty stored values', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      await mockStorage.setItem('empty', '');

      const result = await storageManager.getItem('empty');

      // Empty string should return null
      expect(result).toBe(null);
    });

    it('should include key name in DeserializationError', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      await mockStorage.setItem('test-key', '{invalid json}');

      try {
        await storageManager.getItem('test-key');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DeserializationError);
        expect((error as DeserializationError).key).toBe('test-key');
        expect((error as Error).message).toContain('test-key');
      }
    });
  });

  describe('Storage Implementation Errors', () => {
    it('should wrap setItem errors in StorageWriteError', async () => {
      const failingStorage = new FailingStorage();
      const storageManager = new StorageManager(failingStorage as any);

      await expect(storageManager.setItem('key', 'value')).rejects.toThrow(StorageWriteError);
    });

    it('should wrap getItem errors in StorageReadError', async () => {
      const failingStorage = new FailingStorage();
      const storageManager = new StorageManager(failingStorage as any);

      await expect(storageManager.getItem('key')).rejects.toThrow(StorageReadError);
    });

    it('should wrap removeItem errors in StorageWriteError', async () => {
      const failingStorage = new FailingStorage();
      const storageManager = new StorageManager(failingStorage as any);

      await expect(storageManager.removeItem('key')).rejects.toThrow(StorageWriteError);
    });
  });

  describe('JSON Serialization Errors', () => {
    it('should throw SerializationError for circular references', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      const circular: any = { name: 'test' };
      circular.self = circular;

      await expect(storageManager.setItem('circular', circular)).rejects.toThrow(
        SerializationError
      );
    });

    it('should throw SerializationError for objects with throwing toJSON', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      const throwingObject = {
        value: 'test',
        toJSON: () => {
          throw new Error('toJSON failed');
        }
      };

      try {
        await storageManager.setItem('throwing', throwingObject);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SerializationError);
        expect((error as SerializationError).key).toBe('throwing');
        expect((error as SerializationError).originalError.message).toBe('toJSON failed');
        expect((error as Error).message).toContain('throwing');
        expect((error as Error).message).toContain('toJSON failed');
      }
    });

    it('should throw SerializationError for objects with throwing getters', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      const throwingGetter = {
        get value() {
          throw new Error('Getter failed');
        }
      };

      await expect(storageManager.setItem('getter', throwingGetter)).rejects.toThrow(
        SerializationError
      );
    });

    it('should throw SerializationError for BigInt values', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      await expect(storageManager.setItem('bigint', BigInt(123))).rejects.toThrow(
        SerializationError
      );
    });

    it('should silently convert functions to undefined (JSON.stringify behavior)', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      // JSON.stringify silently drops functions, resulting in null for the value
      await storageManager.setItem('function', () => {});

      const result = await storageManager.getItem('function');
      expect(result).toBe(null);
    });

    it('should silently convert symbols to undefined (JSON.stringify behavior)', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      // JSON.stringify silently drops symbols, resulting in null for the value
      await storageManager.setItem('symbol', Symbol('test'));

      const result = await storageManager.getItem('symbol');
      expect(result).toBe(null);
    });

    it('should provide detailed error messages for serialization failures', async () => {
      const mockStorage = new MockStorage();
      const storageManager = new StorageManager(mockStorage as any);

      const circular: any = { name: 'test' };
      circular.self = circular;

      try {
        await storageManager.setItem('circular-key', circular);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SerializationError);
        expect((error as Error).message).toContain('circular-key');
        expect((error as SerializationError).key).toBe('circular-key');
      }
    });
  });

  describe('Storage Write Errors', () => {
    it('should throw StorageWriteError when quota is exceeded', async () => {
      const quotaStorage = {
        setItem: vi.fn().mockImplementation(() => {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }),
        getItem: vi.fn().mockResolvedValue(null),
        removeItem: vi.fn().mockResolvedValue(undefined)
      };

      const storageManager = new StorageManager(quotaStorage as any);

      await expect(storageManager.setItem('key', 'value')).rejects.toThrow(StorageWriteError);
    });

    it('should throw StorageWriteError with key name and original error', async () => {
      const originalError = new Error('quota exceeded');
      const quotaStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw originalError;
        }),
        getItem: vi.fn().mockResolvedValue(null),
        removeItem: vi.fn().mockResolvedValue(undefined)
      };

      const storageManager = new StorageManager(quotaStorage as any);

      try {
        await storageManager.setItem('my-key', 'value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageWriteError);
        expect((error as StorageWriteError).key).toBe('my-key');
        expect((error as StorageWriteError).originalError).toBe(originalError);
        expect((error as Error).message).toContain('my-key');
        expect((error as Error).message).toContain('quota exceeded');
      }
    });

    it('should throw StorageWriteError for any storage implementation error', async () => {
      const failingStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage is full');
        }),
        getItem: vi.fn().mockResolvedValue(null),
        removeItem: vi.fn().mockResolvedValue(undefined)
      };

      const storageManager = new StorageManager(failingStorage as any);

      await expect(storageManager.setItem('key', 'value')).rejects.toThrow(StorageWriteError);
    });

    it('should preserve original error as cause', async () => {
      const originalError = new Error('Network error');
      const failingStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw originalError;
        }),
        getItem: vi.fn().mockResolvedValue(null),
        removeItem: vi.fn().mockResolvedValue(undefined)
      };

      const storageManager = new StorageManager(failingStorage as any);

      try {
        await storageManager.setItem('test-key', 'value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageWriteError);
        expect((error as StorageWriteError).cause).toBe(originalError);
      }
    });
  });
});

describe('StorageManager - Custom Storage Implementation', () => {
  it('should work with custom async storage', async () => {
    const customStorage = new MockStorage();
    const storageManager = new StorageManager(customStorage as any);

    await storageManager.setItem('test', 'value');
    const result = await storageManager.getItem<string>('test');

    expect(result).toBe('value');
  });

  it('should work with synchronous storage implementation', async () => {
    const syncStorage = new SyncStorage();
    const storageManager = new StorageManager(syncStorage as any);

    await storageManager.setItem('test', 'value');
    const result = await storageManager.getItem<string>('test');

    expect(result).toBe('value');
  });

  it('should handle storage that returns promises', async () => {
    const asyncStorage = {
      setItem: vi.fn().mockResolvedValue(undefined),
      getItem: vi.fn().mockResolvedValue(JSON.stringify('test-value')),
      removeItem: vi.fn().mockResolvedValue(undefined)
    };

    const storageManager = new StorageManager(asyncStorage as any);

    await storageManager.setItem('key', 'value');
    const result = await storageManager.getItem<string>('key');

    expect(asyncStorage.setItem).toHaveBeenCalledWith('key', '"value"', 'session');
    expect(asyncStorage.getItem).toHaveBeenCalledWith('key', 'session');
    expect(result).toBe('test-value');
  });

  it('should handle storage that returns values directly', () => {
    const syncStorage = {
      setItem: vi.fn(),
      getItem: vi.fn().mockReturnValue(JSON.stringify('test-value')),
      removeItem: vi.fn()
    };

    const storageManager = new StorageManager(syncStorage as any);

    return storageManager.getItem<string>('key').then((result) => {
      expect(syncStorage.getItem).toHaveBeenCalledWith('key', 'session');
      expect(result).toBe('test-value');
    });
  });
});

describe('StorageManager - DefaultLocalStorage', () => {
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;

  const createMockStorage = () => ({
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] ?? null;
    },
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    }
  });

  beforeEach(() => {
    // Save references to original storage
    originalLocalStorage = global.localStorage;
    originalSessionStorage = global.sessionStorage;

    // Mock both localStorage and sessionStorage
    global.localStorage = createMockStorage() as any;
    global.sessionStorage = createMockStorage() as any;
  });

  afterEach(() => {
    // Restore original storage
    global.localStorage = originalLocalStorage;
    global.sessionStorage = originalSessionStorage;
  });

  it('should use DefaultLocalStorage when no storage provided', async () => {
    const storageManager = new StorageManager();

    await storageManager.setItem('test', 'value');
    const result = await storageManager.getItem<string>('test');

    expect(result).toBe('value');
    // Default scope is 'session', so check sessionStorage
    expect(sessionStorage.getItem('test')).toBe(JSON.stringify('value'));
  });

  it('should interact with sessionStorage correctly (default scope)', async () => {
    const storageManager = new StorageManager();

    const data = { user: 'John', role: 'admin' };
    await storageManager.setItem('userData', data);

    // Default scope is 'session', so check sessionStorage
    const storedValue = sessionStorage.getItem('userData');
    expect(storedValue).toBe(JSON.stringify(data));
  });

  it('should remove items from sessionStorage (default scope)', async () => {
    const storageManager = new StorageManager();

    await storageManager.setItem('temp', 'temporary');
    await storageManager.removeItem('temp');

    expect(sessionStorage.getItem('temp')).toBe(null);
  });

  it('should throw StorageNotAvailableError when localStorage is undefined', () => {
    // @ts-expect-error - testing undefined localStorage
    global.localStorage = undefined;

    expect(() => new StorageManager()).toThrow(StorageNotAvailableError);
  });

  it('should throw StorageNotAvailableError when localStorage is blocked', () => {
    const blockedStorage = {
      setItem: vi.fn().mockImplementation(() => {
        throw new Error('Access denied');
      }),
      getItem: vi.fn(),
      removeItem: vi.fn()
    };

    global.localStorage = blockedStorage as any;

    expect(() => new StorageManager()).toThrow(StorageNotAvailableError);
  });
});

describe('StorageManager - Edge Cases', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage as any);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it('should handle special characters in keys', async () => {
    const specialKeys = [
      'key-with-dashes',
      'key.with.dots',
      'key_with_underscores',
      'key/with/slashes',
      'key@with#special!chars'
    ];

    for (const key of specialKeys) {
      await storageManager.setItem(key, 'value');
      const result = await storageManager.getItem<string>(key);
      expect(result).toBe('value');
    }
  });

  it('should handle unicode characters in keys', async () => {
    await storageManager.setItem('キー', 'value');
    const result = await storageManager.getItem<string>('キー');
    expect(result).toBe('value');
  });

  it('should handle unicode characters in values', async () => {
    const unicode = { message: 'Hello 世界! 🌍' };
    await storageManager.setItem('unicode', unicode);
    const result = await storageManager.getItem<typeof unicode>('unicode');
    expect(result).toEqual(unicode);
  });

  it('should handle very long strings', async () => {
    const longString = 'a'.repeat(10000);
    await storageManager.setItem('long', longString);
    const result = await storageManager.getItem<string>('long');
    expect(result).toBe(longString);
  });

  it('should handle deeply nested objects', async () => {
    const deep: any = {};
    let current = deep;
    for (let i = 0; i < 100; i++) {
      current.nested = { level: i };
      current = current.nested;
    }

    await storageManager.setItem('deep', deep);
    const result = await storageManager.getItem<typeof deep>('deep');
    expect(result).toEqual(deep);
  });

  it('should handle arrays with mixed types', async () => {
    const mixed = [1, 'two', { three: 3 }, [4], null, true];
    await storageManager.setItem('mixed', mixed);
    const result = await storageManager.getItem<typeof mixed>('mixed');
    expect(result).toEqual(mixed);
  });

  it('should handle Date objects as strings', async () => {
    const date = new Date('2025-01-01');
    await storageManager.setItem('date', date);
    const result = await storageManager.getItem<string>('date');
    // Date objects get serialized to ISO strings
    expect(result).toBe(date.toISOString());
  });

  it('should handle empty objects', async () => {
    await storageManager.setItem('empty-obj', {});
    const result = await storageManager.getItem('empty-obj');
    expect(result).toEqual({});
  });

  it('should handle empty arrays', async () => {
    await storageManager.setItem('empty-arr', []);
    const result = await storageManager.getItem('empty-arr');
    expect(result).toEqual([]);
  });

  it('should handle numeric keys as strings', async () => {
    await storageManager.setItem('123', 'numeric-key');
    const result = await storageManager.getItem<string>('123');
    expect(result).toBe('numeric-key');
  });
});

describe('StorageManager - Type Safety', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage as any);
  });

  it('should handle generic type parameters correctly', async () => {
    interface UserProfile {
      id: number;
      name: string;
      email: string;
    }

    const profile: UserProfile = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    };

    await storageManager.setItem('profile', profile);
    const result = await storageManager.getItem<UserProfile>('profile');

    // TypeScript should infer the correct type
    if (result) {
      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    }
  });

  it('should return null with correct type when key does not exist', async () => {
    const result = await storageManager.getItem<string>('non-existent');
    expect(result).toBe(null);
  });

  it('should handle union types', async () => {
    type Status = 'pending' | 'active' | 'completed';
    const status: Status = 'active';

    await storageManager.setItem('status', status);
    const result = await storageManager.getItem<Status>('status');

    expect(result).toBe('active');
  });
});

describe('StorageManager - Concurrent Operations', () => {
  let mockStorage: MockStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageManager = new StorageManager(mockStorage as any);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it('should handle multiple concurrent writes', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      storageManager.setItem(`key-${i}`, `value-${i}`)
    );

    await Promise.all(promises);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => storageManager.getItem<string>(`key-${i}`))
    );

    results.forEach((result, i) => {
      expect(result).toBe(`value-${i}`);
    });
  });

  it('should handle concurrent reads', async () => {
    await storageManager.setItem('shared', 'shared-value');

    const promises = Array.from({ length: 10 }, () => storageManager.getItem<string>('shared'));

    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result).toBe('shared-value');
    });
  });

  it('should handle mixed concurrent operations', async () => {
    const operations = [
      storageManager.setItem('key1', 'value1'),
      storageManager.getItem('key2'),
      storageManager.setItem('key2', 'value2'),
      storageManager.removeItem('key1'),
      storageManager.getItem('key1')
    ];

    await Promise.all(operations);

    const key1 = await storageManager.getItem('key1');
    const key2 = await storageManager.getItem('key2');

    expect(key1).toBe(null);
    expect(key2).toBe('value2');
  });
});
