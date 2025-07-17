# Selective A.Compute Solution

## Overview

This solution addresses TypeScript build issues by selectively applying `A.Compute` from ts-toolbelt with different modes based on the type complexity and requirements. Instead of using 'deep' mode universally, we use 'flat' mode for certain types that have complex structures or recursive patterns.

## Changes Made

### 1. Created Type Utilities (`packages/client/src/utils/typeUtils.ts`)

This file provides custom utilities for selective type computation:

- **`ShallowCompute<T>`**: Applies `A.Compute` with 'flat' mode for shallow computation
- **`DeepCompute<T>`**: Applies `A.Compute` with 'deep' mode for deep computation
- **`SelectiveCompute<T, TypeName>`**: Conditionally applies different modes based on type name
- **`ComputeWithDepth<T, Depth>`**: Applies computation to a specific depth level

### 2. Modified Type Exports in Client Package

Updated `packages/client/src/index.ts` to use `ShallowCompute` instead of `A.Compute<T, 'deep'>` for the following types:

- `ExternalEmitterContract<EventTypes>`
- `ExternalMemberCapabilityContract`
- `ExternalCallCapabilitiesContract`
- `ExternalConversationContract`
- `ExternalConversationSubscribeCallback`
- `ExternalIncomingCallHandler`
- `ExternalIncomingCallHandlers`
- `ExternalSignalWireClient`
- `ExternalSignalWireContract`
- `ExternalPaginatedResponse<T>`
- `ExternalPaginatedResult<T>`

### 3. Modified Fabric Interface Types

Updated `packages/client/src/utils/interfaces/fabric.ts` to use `ShallowCompute` for:

- `CallMemberContract`

## Why This Works

The 'flat' mode of `A.Compute` only performs one level of computation, which prevents TypeScript from getting stuck in infinite recursion or running into complexity limits when dealing with:

1. **Generic types with type parameters** (e.g., `EmitterContract<EventTypes>`, `PaginatedResponse<T>`)
2. **Types with function signatures** (e.g., `IncomingCallHandler`, `ConversationSubscribeCallback`)
3. **Complex contract types** with many nested properties

Meanwhile, simpler types continue to use 'deep' mode for complete type resolution.

## Benefits

1. **Build Success**: The TypeScript compiler no longer hits complexity limits
2. **Type Safety**: Types are still computed and validated, just at a shallower level where needed
3. **Minimal Changes**: Only affects type computation strategy, not the actual type definitions
4. **Maintainable**: Clear separation between types that need shallow vs deep computation

## Future Considerations

1. **Monitor New Types**: As new types are added, evaluate whether they need shallow or deep computation
2. **TypeScript Updates**: Future TypeScript versions might handle deep computation better
3. **Alternative Solutions**: Consider using TypeScript's built-in `Simplify` utility type when it becomes available

## Testing

After implementing these changes:
- ✅ Build passes successfully
- ✅ No TypeScript errors
- ✅ All packages compile correctly
- ✅ Type exports remain compatible