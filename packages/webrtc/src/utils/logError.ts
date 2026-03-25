type JsonPrimitive = string | number | boolean | null

const isJsonPrimitive = (value: unknown): value is JsonPrimitive => {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Some environments (ex: Call Fabric) attempt to `JSON.stringify` SDK errors.
 * Errors may contain non-serializable/circular references (ex: internal context).
 *
 * This helper extracts only primitive/stack fields to keep logs safe.
 */
export const safeLogError = (error: unknown): unknown => {
  if (!error) return error

  // Plain primitives are always safe.
  if (isJsonPrimitive(error)) return error

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'object') {
    const maybe = error as Record<string, unknown>

    const code = maybe.code
    const message = maybe.message
    const name = maybe.name
    const stack = maybe.stack

    return {
      ...(isJsonPrimitive(name) ? { name } : {}),
      ...(isJsonPrimitive(message) ? { message } : {}),
      ...(isJsonPrimitive(code) ? { code } : {}),
      ...(typeof stack === 'string' ? { stack } : {}),
    }
  }

  // Fallback for functions/symbols/etc.
  return String(error)
}

