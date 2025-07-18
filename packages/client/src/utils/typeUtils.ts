/**
 * Type utilities for the SignalWire Client SDK
 * These utilities help with type computation and resolution
 */
import { A } from 'ts-toolbelt'

/**
 * Shallow compute - only computes the top level of a type
 * Use this for complex generic types or when deep computation causes issues
 */
export type ShallowCompute<T> = A.Compute<T, 'flat'>

/**
 * Deep compute - recursively computes all nested types
 * Use this for simple types where full resolution is needed
 */
export type DeepCompute<T> = A.Compute<T, 'deep'>

/**
 * Selective compute - allows choosing computation depth ('flat' or 'deep')
 * Useful for controlling type computation based on complexity requirements
 */
export type SelectiveCompute<
  T,
  Depth extends 'flat' | 'deep' = 'deep'
> = A.Compute<T, Depth>
