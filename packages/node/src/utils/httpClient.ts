import { URL } from 'url'
import fetch, { RequestInit, Response } from 'node-fetch'
import AbortController from 'node-abort-controller'
import { AuthError, HttpError } from '@signalwire/core'

interface InternalHttpResponse<T> extends Response {
  parsedBody?: T
}

async function http<T>(
  input: string,
  init: RequestInit | undefined
): Promise<InternalHttpResponse<T>> {
  const response: InternalHttpResponse<T> = await fetch(input, init)

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

interface CreateHttpClientOptions extends RequestInit {
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

export const createHttpClient = (
  { baseUrl, timeout = 30000, ...globalOptions }: CreateHttpClientOptions,
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
      const response = await fetcher<T>(
        getUrl({
          path,
          baseUrl,
          searchParams: options?.searchParams,
        }),
        reqInit
      )

      return { body: response.parsedBody as T }
    } catch (e) {
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
