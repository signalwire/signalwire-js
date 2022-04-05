import { fromCamelToSnakeCase } from './common'

export const toSnakeCaseProps = (
  obj: any,
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
  return result
}

