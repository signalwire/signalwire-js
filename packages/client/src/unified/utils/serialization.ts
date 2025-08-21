/**
 * Utilities for serializing and deserializing objects with functions
 */

/**
 * Marker interface for serialized functions
 */
interface SerializedFunction {
  __type: 'function'
  __value: string
}

/**
 * Check if a value is a serialized function marker
 */
function isSerializedFunction(value: unknown): value is SerializedFunction {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    '__value' in value &&
    (value as any).__type === 'function' &&
    typeof (value as any).__value === 'string'
  )
}

/**
 * Serialize an object, converting functions to a serializable format
 * @param obj - Object to serialize
 * @returns JSON string with functions converted to special markers
 */
export function serializeWithFunctions(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'function') {
      return {
        __type: 'function',
        __value: value.toString(),
      } as SerializedFunction
    }
    return value
  })
}

/**
 * Deserialize a JSON string, reconstructing functions from markers
 * @param json - JSON string to deserialize
 * @returns Deserialized object with functions reconstructed
 */
export function deserializeWithFunctions(json: string): unknown {
  return JSON.parse(json, (_key, value) => {
    if (isSerializedFunction(value)) {
      try {
        // Use Function constructor to safely evaluate the function string
        // This handles both regular functions and arrow functions
        const functionString = value.__value
        
        // Check if it's an arrow function
        if (functionString.includes('=>')) {
          // For arrow functions, wrap in parentheses and evaluate
          return eval(`(${functionString})`)
        } else {
          // For regular functions, use Function constructor
          return new Function('return ' + functionString)()
        }
      } catch (error) {
        // If function reconstruction fails, return undefined
        // This maintains backward compatibility with existing behavior
        console.warn(`Failed to deserialize function: ${error}`)
        return undefined
      }
    }
    return value
  })
}

/**
 * Safe JSON parse with function support and validation
 * @param json - JSON string to parse
 * @param validator - Optional validation function
 * @returns Parsed and validated object, or null if invalid
 */
export function safeJsonParseWithFunctions<T>(
  json: string,
  validator?: (data: unknown) => data is T
): T | null {
  try {
    const parsed = deserializeWithFunctions(json)
    if (validator && !validator(parsed)) {
      return null
    }
    return parsed as T
  } catch {
    return null
  }
}