export type CamelToSnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T>
        ? '_'
        : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
    : S

export type EntityUpdated<T> = T & {
  // TODO: `updated` should includes only the "updatable" keys
  updated: Array<keyof T>
}

export type VideoEventToInternal<T extends string> = `video.${T}`
