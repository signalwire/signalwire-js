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
    let body: T
    if (path.includes('addresses')) {
      // @ts-expect-error
      body = {
        links: {
          self: 'https://stulentsev.signalwire.com/api/fabric/addresses?page_number=0&page_size=1',
          first:
            'https://stulentsev.signalwire.com/api/fabric/addresses?page_size=1',
          next: 'https://stulentsev.signalwire.com/api/fabric/addresses?page_number=1&page_size=1&page_token=PA4659e81b-cddc-4440-81b1-a3adb3b8f511',
        },
        data: [
          {
            name: 'third-room-with-address',
            display_name: 'third room with address',
            resource_id: '55061565-2d5e-409e-9338-28732010cf4b',
            type: 'room',
            cover_url: null,
            preview_url: null,
            channels: {
              video: '/public/third-room-with-address?channel=video',
              voice: '/public/third-room-with-address?channel=voice',
            },
          },
        ],
      }
    } else {
      // @ts-expect-error
      body = {
        strategy: 'room',
        params: {
          token:
            'eyJ0eXAiOiJWUlQiLCJjaCI6InJlbGF5LnNpZ25hbHdpcmUuY29tIiwiYWxnIjoiSFM1MTIifQ.eyJpYXQiOjE2NjkyMjEyNTAsImp0aSI6ImU4MDY3YTk2LTcyNTMtNDliZS05ODc1LWU0YjdkNTg4OGI2OSIsInN1YiI6IjRiN2FlNzhhLWQwMmUtNDg4OS1hNjNiLTA4YjE1NmQ1OTE2ZSIsInUiOiJlZG9hcmRvIiwiamEiOiJtZW1iZXIiLCJyIjoic3VwcG9ydC0yMzc3IiwicyI6WyJyb29tLmxpc3RfYXZhaWxhYmxlX2xheW91dHMiLCJyb29tLnNldF9tZXRhIiwicm9vbS5zZXRfbGF5b3V0Iiwicm9vbS5zZWxmLmF1ZGlvX211dGUiLCJyb29tLnNlbGYuYXVkaW9fdW5tdXRlIiwicm9vbS5zZWxmLnZpZGVvX211dGUiLCJyb29tLnNlbGYudmlkZW9fdW5tdXRlIiwicm9vbS5tZW1iZXIuZGVtb3RlIiwicm9vbS5tZW1iZXIucHJvbW90ZSIsInJvb20uaGlkZV92aWRlb19tdXRlZCIsInJvb20ubWVtYmVyLnNldF9tZXRhIiwicm9vbS5zdHJlYW0iXSwiYWNyIjp0cnVlLCJtYSI6ImFsbCIsIm10YSI6e30sInJtdGEiOnt9fQ.nhGWwbBmtd89bKCMG90kWDAZ3bjyvFpbPKH6TNKdEB6a23sj8udj5UQ_PzF07SxXWtYWfS_uxdEGcunxjLOHpA',
        },
      }
    }
    return { body }
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

export const getRequestInit = (options: any): RequestInit => {
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

export const getUrl = ({
  path,
  baseUrl,
  searchParams,
}: {
  baseUrl: string
  path: string
  searchParams?: Record<string, any>
}) => {
  console.log('1', { path, baseUrl })
  const url = new URL(path, baseUrl)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value != undefined) {
        url.searchParams.append(key, value)
      }
    })
  }
  console.log('1', { a: url.toString() })
  return url.toString()
}
