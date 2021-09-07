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

export interface ConstructableType<T> {
  new (o: any): T
}
