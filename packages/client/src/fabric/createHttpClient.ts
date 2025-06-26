import {
  asyncRetry,
  AuthError,
  HttpError,
  increasingDelay,
} from '@signalwire/core'
import { ApiRequestRetriesOptions } from './interfaces'

interface InternalHttpResponse<T> extends Response {
  parsedBody?: T
}

const DEFAULT_MAX_RETRIES = 0
const DEFAULT_INITIAL_DELAY = 0
const DEFAULT_DELAY_VARIATION = 0
const DEFAULT_TIMEOUT = 30000

async function http<T>(
  input: string,
  init: RequestInit | undefined,
  maxRetries?: number,
  retriesDelay?: number,
  retriesDelayIncrement?: number
): Promise<InternalHttpResponse<T>> {
  const response: InternalHttpResponse<T> = await asyncRetry({
    asyncCallable: () => fetch(input, init),
    maxRetries,
    validator: (response) => {
      // whe should retry only error above Http-500
      if (!response.ok && response.status >= 500) {
        throw new HttpError(response.status, response.statusText)
      }
    },
    delayFn: increasingDelay({
      initialDelay: retriesDelay,
      variation: retriesDelayIncrement,
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError(response.status, 'Unauthorized')
    }

    let errorResponse
    try {
      errorResponse = await response.json()
    } catch (e) {}

    const errorMessage = errorResponse?.errors
      ? JSON.stringify(errorResponse.errors)
      : 'Not Found'

    throw new HttpError(response.status, errorMessage, errorResponse)
  }

  try {
    // might throw if body is empty
    response.parsedBody = await response.json()
  } catch (e) {}

  return response
}

type CreateHttpClientOptions = RequestInit &
  Partial<ApiRequestRetriesOptions> & {
    baseUrl: string
    /**
     * Timeout in milliseconds
     */
    timeout?: number
  }

interface HttpClientRequestInit extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown>
  searchParams?: Record<string, any>
}

export type CreateHttpClient = ReturnType<typeof createHttpClient>

export const createHttpClient = (
  {
    baseUrl,
    maxApiRequestRetries: retries = DEFAULT_MAX_RETRIES,
    apiRequestRetriesDelay: retriesDelay = DEFAULT_INITIAL_DELAY,
    apiRequestRetriesDelayIncrement:
      retriesDelayIncrement = DEFAULT_DELAY_VARIATION,
    timeout = DEFAULT_TIMEOUT,
    ...globalOptions
  }: CreateHttpClientOptions,
  fetcher = http
) => {
  const apiClient = async <T>(
    path: string,
    options?: HttpClientRequestInit
  ): Promise<{ body: T }> => {
    const headers = {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...globalOptions.headers,
      ...options?.headers,
    }

    const reqInit = getRequestInit({
      ...globalOptions,
      ...options,
      headers,
    })
    // reqInit.mode = 'no-cors'
    // reqInit.credentials = 'include'

    let timerId
    if (timeout) {
      const controller = new AbortController()
      const signal = controller.signal

      reqInit.signal = signal

      timerId = setTimeout(() => {
        controller.abort()
      }, timeout)
    }

    try {
      console.log(
        `Request to ${path} with options:`,
        JSON.stringify(
          {
            path,
            baseUrl,
            searchParams: options?.searchParams,
          },
          null,
          2
        )
      )
      const response = await fetcher<T>(
        getUrl({
          path,
          baseUrl,
          searchParams: options?.searchParams,
        }),
        reqInit,
        retries,
        retriesDelay,
        retriesDelayIncrement
      )
      console.log(
        `Response from ${path}:`,
        JSON.stringify(response.parsedBody, null, 2)
      )
      return { body: response.parsedBody as T }
    } catch (e) {
      console.log(`Error from ${path}:`, JSON.stringify(e, null, 2))
      throw e
    } finally {
      timerId && clearTimeout(timerId)
    }
  }

  return apiClient
}

const getBody = (body: unknown) => {
  return typeof body === 'string' ? body : JSON.stringify(body)
}

const getRequestInit = (options: any): RequestInit => {
  return Object.entries(options).reduce((reducer, [key, value]) => {
    if (key === 'body') {
      return {
        ...reducer,
        body: getBody(value),
      }
    } else if (value != undefined) {
      return {
        ...reducer,
        [key]: value,
      }
    }

    return reducer
  }, {} as RequestInit)
}

const getUrl = ({
  path,
  baseUrl,
  searchParams,
}: {
  baseUrl: string
  path: string
  searchParams?: Record<string, any>
}) => {
  const url = new URL(path, baseUrl)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value != undefined) {
        url.searchParams.append(key, value)
      }
    })
  }
  return url.toString()
}
