import { CamelToSnakeCase } from '../types/utils'
import { fromCamelToSnakeCase } from './common'

type ToSnakeCaseProps<T> = {
  [Property in NonNullable<keyof T> as CamelToSnakeCase<
    Extract<Property, string>
  >]: T[Property]
}

export const toSnakeCaseProps = <T extends Record<string, any>>(
  obj: T,
  transform: (value: string) => any = (value: string) => value,
  result: Record<string, any> = {}
) => {
  Object.keys(obj).forEach((key) => {
    const newKey = fromCamelToSnakeCase(key)
    if (typeof obj[key] === 'object') {
      result[newKey] = toSnakeCaseProps(obj[key], transform, result[newKey])
    } else {
      result[newKey] = transform(obj[key])
    }
  })
  return result as ToSnakeCaseProps<T>
}
