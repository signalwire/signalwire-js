# Architecture Guidelines

This document outlines the architecture patterns and dependency rules for the SignalWire main library.

## Core Principles

The library follows a **reactive architecture** using RxJS observables with dependency inversion to minimize circular dependencies and improve testability.

## Dependency Rules

### ✅ DO

- **Import directly from source files** - Never use barrel exports (index.ts) for internal imports
- **Use `import type` for type-only imports** - Helps prevent circular dependencies
- **Depend on interfaces, not concrete classes** - Use dependency inversion for better decoupling
- **Inject dependencies via constructor** - Avoid static singleton access in constructors
- **Keep types in separate files** - Types should be in `/core/types` or `/interfaces` directories

### ❌ DON'T

- **Import from barrel exports** - Avoid `from './model'` or `from './index'`
- **Import from entry points** - Never import from `index.ts` or `browser-entry.ts` in internal modules
- **Access singletons statically in constructors** - Use constructor injection instead
- **Mix type and implementation imports** - Use `import type` for types
- **Create bidirectional dependencies** - Break cycles using interfaces

## Interface Naming Convention

When extracting interfaces to break circular dependencies, follow these patterns:

### Pattern 1: Technology/Protocol Prefix (Preferred)

Use when the implementation uses a specific technology or protocol.

```typescript
// Interface gets clean name
export interface Call { }
export interface VertoManager { }

// Implementation gets technology prefix
export class WebRTCCallSession implements Call { }
export class WebRTCVertoManager implements VertoManager { }
```

### Pattern 2: Remove Suffix for Interface

Use for containers, repositories, or services.

```typescript
// Interface gets clean name (suffix removed)
export interface Preferences { }
export interface Dependency { }
export interface Device { }

// Implementation keeps its descriptive name
export class PreferencesContainer implements Preferences { }
export class DependencyContainer implements Dependency { }
export class DeviceController implements Device { }
```

### Pattern 3: Specific Implementation Names

Use when you have multiple specific implementations.

```typescript
// Interface gets clean name
export interface Participant { }

// Multiple specific implementations
export class SelfParticipant implements Participant { }
export class RemoteParticipant implements Participant { }
```

### ❌ DON'T Use These Patterns

```typescript
// ❌ Using I prefix - NEVER DO THIS
export interface ICall { }
export interface IParticipant { }
export interface IVertoManager { }

// ❌ Generic suffixes without meaning
export interface Call { }
export class CallClass implements Call { }

// ❌ Redundant naming
export interface CallInterface { }
export class Call implements CallInterface { }
```

## Architecture Patterns

### 1. Dependency Inversion

Controllers and models depend on interfaces, not concrete classes:

```typescript
// ✅ Good: Interface dependency
import type { VertoManager } from '../interfaces/VertoManager';

export class SelfParticipant {
  constructor(private vertoManager: VertoManager) {}
}

// ✅ Good: Inject concrete implementation
import { WebRTCVertoManager } from '../managers/VertoManager';

const participant = new SelfParticipant(
  new WebRTCVertoManager()
);
```

```typescript
// ❌ Bad: Direct dependency on concrete class
import { WebRTCVertoManager } from '../managers/VertoManager';

export class SelfParticipant {
  constructor(private vertoManager: WebRTCVertoManager) {}
}
```

### 2. Type Organization

```
/src
  /interfaces         # Interface definitions for dependency inversion
    Device.ts         # Device interface
    Dependency.ts     # Dependency container interface
    VertoManager.ts   # Manager interfaces
  /core/types         # Type definitions (enums, type aliases, etc.)
    call.types.ts     # Call-related types
    participant.types.ts  # Participant-related types
  /containers         # Singleton containers implementing interfaces
  /controllers        # Controllers implementing interfaces
  /managers           # Managers implementing interfaces
  /core/model         # Domain models
```

### 3. Import Patterns

#### Good Imports

```typescript
// Type-only imports
import type { CallInterface } from '../core/types/call.types';
import type { VertoManager } from '../interfaces/VertoManager';
import type { Device } from '../interfaces/Device';

// Direct imports from source files
import { PreferencesContainer } from '../containers/PreferencesContainer';
import { WebRTCVertoManager } from '../managers/VertoManager';
```

#### Bad Imports

```typescript
// ❌ Importing from barrel exports
import { Call, Participant } from '../core/model';

// ❌ Importing from entry points
import { PreferencesContainer } from '../../browser-entry';

// ❌ Mixing type and value imports
import { CallInterface, WebRTCCallSession } from '../core/types/call.types';
```

## Breaking Circular Dependencies

### Decision Tree: "How do I break this cycle?"

```
Is the cycle through a barrel export (index.ts)?
├─ YES → Remove barrel export, use direct imports
└─ NO
   │
   Is the cycle through entry points (index.ts/browser-entry.ts)?
   ├─ YES → Replace entry point imports with direct imports
   └─ NO
      │
      Is the cycle between two classes that need each other?
      ├─ YES → Extract interface, use Dependency Inversion
      └─ NO
         │
         Is the cycle through static singleton access?
         ├─ YES → Use constructor injection instead
         └─ NO
            │
            Is the cycle through type imports?
            └─ YES → Extract types to separate file, use 'import type'
```

## Key Interfaces

### Device Interface

```typescript
export interface Device {
  readonly selectedAudioInputDevice: MediaDeviceInfo | null;
  readonly selectedVideoInputDevice: MediaDeviceInfo | null;
  deviceInfoToConstraints(deviceInfo: MediaDeviceInfo | null): MediaTrackConstraints;
  // ... other device methods
}
```

### Dependency Interface

```typescript
export interface Dependency {
  readonly userId: string;
  user: User;
  readonly deviceController: Device;
  // ... other dependencies
}
```

### Call Interface

```typescript
export interface CallInterface {
  readonly id: string;
  readonly status$: Observable<CallStatus>;
  readonly participants$: Observable<Participant[]>;
  executeMethod<T>(target: string, method: string, args: Record<string, unknown>): Promise<T>;
  // ... other call methods
}
```

### VertoManager Interface

```typescript
export interface VertoManager {
  readonly screenShareStatus$: Observable<ScreenShareStatus>;
  addScreenMedia(): Promise<void>;
  removeScreenMedia(): Promise<void>;
  // ... other manager methods
}
```

## Circular Dependency Tracking

### NPM Scripts

```bash
# Check for circular dependencies (warning mode)
npm run check:circular

# Check for circular dependencies (error mode)
npm run check:circular:error
```

### Current Status

As of the last refactoring (Phases 4-6 complete):

- **Container/Controller cycles**: Broken using interface extraction
- **Model interdependencies**: Broken using CallInterface and Participant types
- **Manager/Model cycles**: Broken using VertoManager interface
- **Remaining cycles**: Primarily through barrel exports and type dependencies

## Migration Strategy

When extracting interfaces from existing classes:

1. **Analyze the class name** - Does it already have a descriptive suffix/prefix?
2. **Choose the appropriate pattern** based on the context
3. **Update all references** to use the interface type, not the concrete class
4. **Verify consistency** with existing codebase patterns

## Testing

All classes should be testable in isolation:

```typescript
// ✅ Good: Testable with mock interface
class SelfParticipant {
  constructor(private vertoManager: VertoManager) {}
}

// Test with mock
const mockVertoManager: VertoManager = {
  addScreenMedia: jest.fn(),
  // ... other methods
};
const participant = new SelfParticipant(mockVertoManager);
```

## References

- [Circular Dependencies Implementation Guide](../../../notes/notes/claude-code/signalwire-typescript/circular-dependencies-implementation-guide.md)
- TypeScript: [Import Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- SOLID Principles: [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
