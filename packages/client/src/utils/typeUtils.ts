import { A } from 'ts-toolbelt'

/**
 * Selective type computation utility that applies A.Compute with different modes
 * based on the type complexity and requirements.
 */

// Types that should use 'flat' mode instead of 'deep'
type FlatComputeTypes = 
  | 'EmitterContract'
  | 'CallMemberContract'
  | 'MemberCapabilityContract'
  | 'CallCapabilitiesContract'
  | 'ConversationContract'
  | 'SignalWireContract'
  | 'SignalWireClient'

// Types that might have recursive or complex structures
type ComplexTypes = 
  | 'PaginatedResponse'
  | 'PaginatedResult'
  | 'ConversationSubscribeCallback'
  | 'IncomingCallHandler'
  | 'IncomingCallHandlers'

/**
 * Selectively applies A.Compute based on the type name or structure.
 * For most types, we use 'deep' mode, but for types with complex generics
 * or recursive structures, we use 'flat' mode to avoid TypeScript errors.
 */
export type SelectiveCompute<T, TypeName extends string = string> = 
  TypeName extends FlatComputeTypes ? A.Compute<T, 'flat'> :
  TypeName extends ComplexTypes ? A.Compute<T, 'flat'> :
  A.Compute<T, 'deep'>

/**
 * Alternative: Apply A.Compute only to specific depth levels
 * This is useful when you want to compute deeply but avoid infinite recursion
 */
export type ComputeWithDepth<T, Depth extends number = 3> = 
  Depth extends 0 ? T :
  T extends (...args: any[]) => any ? T :
  T extends Promise<infer U> ? Promise<ComputeWithDepth<U, Depth>> :
  T extends Array<infer U> ? Array<ComputeWithDepth<U, Depth>> :
  T extends object ? A.Compute<{
    [K in keyof T]: ComputeWithDepth<T[K], Depth extends 1 ? 0 : Depth extends 2 ? 1 : Depth extends 3 ? 2 : never>
  }, 'flat'> :
  T

/**
 * For types with generics, we can apply a shallow compute
 */
export type ShallowCompute<T> = A.Compute<T, 'flat'>

/**
 * For simple types, we can still use deep compute
 */
export type DeepCompute<T> = A.Compute<T, 'deep'>