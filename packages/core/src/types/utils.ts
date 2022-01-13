export type CamelToSnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T>
        ? '_'
        : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
    : S

export type SnakeToCamelCase<S extends string> =
  S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
    : S

export type EntityUpdated<T> = T & {
  // TODO: `updated` should includes only the "updatable" keys
  updated: Array<keyof T>
}

export type ToInternalVideoEvent<T extends string> = `video.${T}`

type OnlyFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

type OnlyStatePropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

export type OnlyFunctionProperties<T> = Pick<T, OnlyFunctionPropertyNames<T>>

export type OnlyStateProperties<T> = Pick<T, OnlyStatePropertyNames<T>>

type ShapeOf<T> = Omit<T, never>

/**
 * This type fails to be evaluated if the two type parameters don't match. If
 * they match, it is equal to one of the two types.
 *
 * Motivation: we use this type for documentation purposes. Some of the types
 * and interfaces that we want to publicly expose have several layers of
 * indirection and are not detected correctly by TypeDoc. To workaround the
 * problem, we additionally write a fully documented explicit type and we use
 * `AssertSameType` to ensure that the two are equal at compile-time. Of the two
 * input types, `AssertSameType` returns the documented one (which, apart from
 * documentation, is indistinguishable from the other one).
 *
 * As an example, say we want to expose an interface named `RoomSession`, whose
 * methods are not currently getting picked up by TypeDoc:
 *
 * ```typescript
 * export interface RoomSession { ... }
 * ```
 *
 * To make `RoomSession` documentable, we rename it (as a convention) into
 * `RoomSessionMain` and we also add an equivalent `RoomSessionDocs` with
 * explicit types:
 *
 * ```typescript
 * interface RoomSessionMain { ... }
 *
 * interface RoomSessionDocs {
 *   // doc string ...
 *   audioMute(params: { memberId: string }): Promise<void>
 *
 *   // doc string ...
 *   audioUnmute(params: { memberId: string }): Promise<void>
 * }
 * ```
 *
 * Then, we export a new interface which extends AssertSameType:
 *
 * ```typescript
 * export interface RoomSession extends
 *                          AssertSameType<RoomSessionMain, RoomSessionDocs> {}
 * ```
 *
 * If `RoomSessionMain` and `RoomSessionDocs` are not equal, we get a
 * compile-time error. If they are equal, `RoomSession` will refer to the
 * documented version of the methods.
 */
export type AssertSameType<
  ExpectedType extends ShapeOf<Output>,
  Output extends ShapeOf<ExpectedType>
> = Output

type IsTimestampProperty<Property> = Property extends `${string}_at`
  ? Property
  : never

export interface DefaultPublicToInternalTypeMapping {
  startedAt?: number
  endedAt?: number
}

export interface DefaultInternalToPublicTypeMapping {}

/**
 * Note: Property is snake_case
 */
export type ConverToExternalTypes<
  Property extends string,
  DefaultType,
  TypesMap extends Partial<
    Record<string, any>
  > = DefaultInternalToPublicTypeMapping
> = Property extends IsTimestampProperty<Property>
  ? // We're basically checking that `Property` exists inside
    // of `TypesMap`, if not we'll default to Date
    TypesMap[Property] extends TypesMap[keyof TypesMap]
    ? TypesMap[Property]
    : Date
  : DefaultType

/**
 * For user convenience, sometimes we expose properties with
 * a different type than the one used by the server. A good
 * example of this are the `startedAt` and `endedAt` fields
 * where we give a `Date` object to the user while the
 * server treat them as timestamps (`number`).
 */
export type ConvertToInternalTypes<
  Property extends string,
  DefaultType,
  TypesMap extends Partial<
    Record<string, any>
  > = DefaultPublicToInternalTypeMapping
> = Property extends IsTimestampProperty<Property>
  ? TypesMap[Property]
  : DefaultType

export interface ConstructableType<T> {
  new (o?: any): T
}

export interface MemberCommandParams {
  memberId?: string
}
export interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
export interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}

type IsAny<T> = 0 extends 1 & T ? true : false
type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
  ? true
  : false

type Primitive = string | number | boolean | bigint | symbol | undefined | null

type Builtin = Primitive | Function | Date | Error | RegExp

export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepReadonly<U>>
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : IsUnknown<T> extends true
  ? unknown
  : Readonly<T>
