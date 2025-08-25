---
"@signalwire/client": major
---

feat(client): Implement Client Factory for multi-instance management

This introduces a comprehensive Client Factory system that enables multiple SignalWire client instances with isolated authentication and storage:

**Key Features:**
- **Profile Management**: Static and dynamic profiles with credential management
- **Multi-Instance Support**: Isolated client instances with different profiles
- **Credential Refresh**: Automatic token refresh with scheduling
- **Address Resolution**: Dynamic profile creation for shared resources
- **Storage Abstraction**: Pluggable storage with key prefixing
- **Type Safety**: Complete TypeScript implementation with type guards

**Breaking Changes:**
- Profile structure updated with new credential format
- Storage keys changed to use `swcf:` prefix
- SignalWire constructor accepts new `clientId` and `storage` parameters
- addProfiles methods now return Profile objects instead of string IDs

**New APIs:**
- `ClientFactory` - Main factory for managing client instances
- `ProfileManager` - Profile lifecycle and credential management  
- `InstanceManager` - Client instance lifecycle
- Storage adapters with `LocalStorageAdapter`

**Backward Compatibility:**
- Existing SignalWire usage remains compatible (singleton pattern)
- Original API signatures preserved for simple use cases