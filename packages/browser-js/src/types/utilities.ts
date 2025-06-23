/**
 * Type Utilities for @signalwire/browser-js
 * 
 * This module provides advanced TypeScript utility types for transforming complex 
 * nested types from @signalwire/core into clean, readable public API types.
 * 
 * These utilities enable us to:
 * - Maintain type safety while cleaning up complex inferred types
 * - Provide better IDE experience with expanded type tooltips
 * - Follow DRY principles by deriving from source types
 * - Automatically update when core types change
 */

/**
 * Core utility type for prettifying complex types.
 * Expands complex nested types into flat, readable structures for better IDE tooltips.
 * 
 * @example
 * ```typescript
 * type ComplexType = Pick<SomeInterface, 'a' | 'b'> & { c: string }
 * type CleanType = Prettify<ComplexType>
 * // IDE will show: { a: TypeA; b: TypeB; c: string }
 * ```
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Recursive version for deep type expansion.
 * Prettifies nested objects while preserving function signatures.
 * 
 * @example
 * ```typescript
 * type NestedType = {
 *   user: Pick<User, 'id' | 'name'> & { meta: { role: string } }
 *   callback: (data: ComplexEventType) => void
 * }
 * type CleanNested = DeepPrettify<NestedType>
 * // Expands user object but keeps callback function signature intact
 * ```
 */
export type DeepPrettify<T> = {
  [K in keyof T]: T[K] extends object
    ? T[K] extends (...args: any[]) => any
      ? T[K] // Keep functions as-is
      : T[K] extends Array<infer U>
      ? Array<DeepPrettify<U>> // Handle arrays
      : T[K] extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPrettify<U>> // Handle readonly arrays
      : DeepPrettify<T[K]> // Recursively prettify objects
    : T[K];
} & {};

/**
 * Simplifies complex union types into a more readable form.
 * Useful for event type unions and conditional type results.
 * 
 * @example
 * ```typescript
 * type ComplexUnion = (A & { type: 'a' }) | (B & { type: 'b' })
 * type SimpleUnion = SimplifyUnion<ComplexUnion>
 * ```
 */
export type SimplifyUnion<T> = T extends infer U ? U : never;

/**
 * Recursively expands all nested type references.
 * More aggressive than DeepPrettify, useful for final public API types.
 * 
 * @example
 * ```typescript
 * type PublicCallSession = ExpandRecursively<InternalCallSessionType>
 * ```
 */
export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

/**
 * Utility type for cleaning up complex event handler signatures.
 * Transforms internal event handlers into clean public API handlers.
 * 
 * @example
 * ```typescript
 * type InternalHandler = (event: ComplexInternalEvent) => void
 * type PublicHandler = EventHandler<InternalHandler>
 * ```
 */
export type EventHandler<T> = T extends (...args: infer P) => infer R
  ? (...args: DeepPrettify<P>) => R
  : never;

/**
 * Clean up complex event maps by prettifying all handler types.
 * Transforms internal Redux-based event maps into clean public APIs.
 * 
 * @example
 * ```typescript
 * type InternalEventMap = {
 *   'call.joined': (event: ComplexCallJoinedEvent) => void
 *   'call.updated': (event: ComplexCallUpdatedEvent) => void
 * }
 * type PublicEventMap = CleanEventMap<InternalEventMap>
 * ```
 */
export type CleanEventMap<T> = {
  [K in keyof T]: EventHandler<T[K]>;
};

/**
 * Remove properties that start with underscore or contain 'internal'.
 * Useful for stripping internal implementation details from public types.
 * 
 * @example
 * ```typescript
 * type InternalType = {
 *   id: string
 *   name: string
 *   _internalId: string
 *   internalState: any
 * }
 * type PublicType = StripInternal<InternalType>
 * // Result: { id: string; name: string }
 * ```
 */
export type StripInternal<T> = {
  [K in keyof T as K extends `_${string}` 
    ? never 
    : K extends `${string}internal${string}` 
    ? never 
    : K]: T[K];
};

/**
 * Transform object properties to use consistent naming conventions.
 * Converts snake_case properties to camelCase for public APIs.
 */
export type CamelCaseKeys<T> = {
  [K in keyof T as K extends string 
    ? CamelCaseString<K> 
    : K]: T[K];
};

/**
 * Helper type for converting snake_case strings to camelCase.
 */
type CamelCaseString<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Uppercase<P2>}${CamelCaseString<P3>}`
  : S;

/**
 * Make specific properties optional while keeping others required.
 * More flexible than TypeScript's built-in Partial.
 * 
 * @example
 * ```typescript
 * type CallOptions = {
 *   to: string
 *   audio: boolean
 *   video: boolean
 *   timeout: number
 * }
 * type CallOptionsWithDefaults = MakeOptional<CallOptions, 'audio' | 'video' | 'timeout'>
 * // Result: { to: string; audio?: boolean; video?: boolean; timeout?: number }
 * ```
 */
export type MakeOptional<T, K extends keyof T> = 
  Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract only the properties that are functions from a type.
 * Useful for separating methods from state in complex objects.
 */
export type OnlyMethods<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};

/**
 * Extract only the properties that are not functions from a type.
 * Useful for separating state from methods in complex objects.
 */
export type OnlyState<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};

/**
 * Create a type that requires at least one property from the given keys.
 * Useful for configuration objects where at least one option must be provided.
 * 
 * @example
 * ```typescript
 * type MediaOptions = RequireAtLeastOne<{
 *   audio?: boolean
 *   video?: boolean
 *   screen?: boolean
 * }, 'audio' | 'video' | 'screen'>
 * // At least one of audio, video, or screen must be provided
 * ```
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Type-safe way to pick nested properties from complex objects.
 * Maintains type safety while selecting specific nested paths.
 * 
 * @example
 * ```typescript
 * type NestedData = {
 *   user: { profile: { name: string; email: string } }
 *   settings: { theme: string }
 * }
 * type UserProfile = DeepPick<NestedData, 'user.profile'>
 * ```
 */
export type DeepPick<T, K extends string> = 
  K extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? { [P in Key]: DeepPick<T[Key], Rest> }
      : never
    : K extends keyof T
    ? { [P in K]: T[K] }
    : never;

/**
 * Utility to merge two types with the second type taking precedence.
 * Useful for extending base configurations with overrides.
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Transform a type to make all properties optional except the specified keys.
 * Useful for update operations where only certain fields are required.
 */
export type PartialExcept<T, K extends keyof T> = 
  Partial<T> & Pick<T, K>;

/**
 * Type guard utility for runtime type checking.
 * Helps create type-safe runtime validation functions.
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Utility for creating branded types to prevent mixing of similar types.
 * Useful for IDs, tokens, and other string-based identifiers.
 * 
 * @example
 * ```typescript
 * type CallId = Brand<string, 'CallId'>
 * type MemberId = Brand<string, 'MemberId'>
 * 
 * // These types are not assignable to each other even though both are strings
 * ```
 */
export type Brand<T, B extends string> = T & { __brand: B };