# SignalWire Storage

This module provides a flexible storage abstraction for the SignalWire Client Factory SDK.

## Components

### SignalWireStorageContract

The main interface that defines the storage API. All storage implementations must implement this contract.

### LocalStorageAdapter

A browser-based implementation using `localStorage` and `sessionStorage` for persistent and session storage respectively.

### StorageWrapper

A utility that wraps any storage implementation and adds client-specific key prefixing to ensure data isolation between different client instances.

## Usage Example

```typescript
import { LocalStorageAdapter, StorageWrapper } from '@signalwire/client'

// Create a storage adapter
const adapter = new LocalStorageAdapter()

// Wrap it with client-specific prefixing
const profileId = 'my-client-123'
const storage = new StorageWrapper(adapter, profileId)

// Use persistent storage
await storage.set('userPreferences', { theme: 'dark', volume: 0.8 })
const prefs = await storage.get('userPreferences')
console.log(prefs) // { theme: 'dark', volume: 0.8 }

// Use session storage (cleared when browser session ends)
await storage.setSession('temporaryToken', 'abc123')
const token = await storage.getSession('temporaryToken')

// Batch operations
await storage.setMany(
  new Map([
    ['setting1', 'value1'],
    ['setting2', 'value2'],
  ])
)

const values = await storage.getMany(['setting1', 'setting2', 'setting3'])
// Map { 'setting1' => 'value1', 'setting2' => 'value2', 'setting3' => null }

// List keys with optional prefix
const allKeys = await storage.list()
const userKeys = await storage.list('user:')

// Clear storage
await storage.clear('temp:') // Clear only keys starting with 'temp:'
await storage.clear() // Clear all client-specific keys

// Check storage availability
const info = await storage.getStorageInfo()
console.log(info)
// {
//   type: 'localStorage',
//   isAvailable: true,
//   isPersistent: true,
//   quotaUsed: 1234,
//   quotaTotal: 5242880
// }
```

## Key Prefixing

The `StorageWrapper` automatically prefixes all keys with `swcf:${profileId}:` to ensure data isolation between different client instances. This means:

- Key `userPrefs` becomes `swcf:my-client-123:userPrefs` in the underlying storage
- Only keys with the correct prefix are returned by list operations
- Clear operations only affect keys with the matching prefix

## Error Handling

The storage adapters handle common browser storage errors:

- **QuotaExceededError**: When storage quota is exceeded
- **SecurityError**: When storage access is denied (e.g., in private browsing)
- **Unavailable Storage**: Gracefully handles cases where storage is not available

## Custom Storage Implementations

You can create custom storage implementations by implementing the `SignalWireStorageContract` interface:

```typescript
import { SignalWireStorageContract, StorageInfo } from '@signalwire/client'

class MyCustomStorage implements SignalWireStorageContract {
  async get<T>(key: string): Promise<T | null> {
    // Your implementation
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Your implementation
  }

  // Implement all other required methods...

  async getStorageInfo(): Promise<StorageInfo> {
    return {
      type: 'custom',
      isAvailable: true,
      isPersistent: true,
    }
  }
}

// Use with StorageWrapper for key prefixing
const customStorage = new StorageWrapper(new MyCustomStorage(), 'client-id')
```
