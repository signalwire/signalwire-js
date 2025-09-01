---
"@signalwire/client": minor
"@signalwire/core": minor
---

Implement comprehensive device preference management system with Redux integration

Add Device Preference Management with DeviceManager, DeviceMonitor, and DeviceRecoveryEngine classes. Features include automatic device preference persistence, device monitoring, failure recovery, and seamless BaseRoomSession integration. Maintains full backward compatibility with zero overhead when disabled.

**Key Features:**
- Device preference persistence and management
- Real-time device monitoring and change detection  
- Automatic device failure recovery strategies
- Redux/Saga architecture integration
- Full TypeScript support
- Zero breaking changes

**Components:**
- DeviceManager: Core device preference management
- DeviceMonitor: Device enumeration and change detection
- DeviceRecoveryEngine: Automatic device failure recovery
- BaseRoomSession integration with enhanced device methods
- Comprehensive test suite (434 passing tests)

**Architecture:**
- Follows SDK Redux/Saga patterns
- EventEmitter API with Redux dispatch integration  
- Worker-based saga architecture
- Lazy initialization for zero overhead

**Backward Compatibility:**
- All existing code continues to work unchanged
- Device preferences are optional
- Enhanced methods fall back to standard behavior
- Zero overhead when feature is disabled