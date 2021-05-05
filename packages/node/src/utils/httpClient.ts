import { URL } from 'url'
import fetch, { RequestInit, Response } from 'node-fetch'

interface InternalHttpResponse<T> extends Response {
  parsedBody?: T
}

class HttpError extends Error {
  name = 'HttpError'

  constructor(public code: number, public message: string) {
    super(message)
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

async function http<T>(
  input: string,
  init: RequestInit | undefined
): Promise<InternalHttpResponse<T>> {
  const response: InternalHttpResponse<T> = await fetch(input, init)

  if (!response.ok) {
    const data = await response.json()

    throw new HttpError(response.status, data.message)
  }

  try {
    // might throw if body is empty
    response.parsedBody = await response.json()
  } catch (e) {}

  return response
}

interface MakeApiClientOptions extends RequestInit {
  baseUrl: string
}

interface HttpClientRequestInit extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown>
  searchParams?: Record<string, any>
}

export const makeApiClient = (
  { baseUrl, ...globalOptions }: MakeApiClientOptions,
  fetcher = http
) => {
  const apiClient = async <T>(
    path: string,
    options?: HttpClientRequestInit
  ): Promise<{ body: T }> => {
    let reqInit
    const headers = {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...globalOptions.headers,
      ...options?.headers,
    }

    if (options?.method === 'GET') {
      reqInit = getRequestInit({
        ...globalOptions,
        ...options,
        headers,
      })
    } else {
      reqInit = getRequestInit({
        ...globalOptions,
        ...options,
        headers,
        body:
          options?.body && typeof options.body !== 'string'
            ? JSON.stringify(options.body)
            : options?.body,
      })
    }

    if (!reqInit) {
      throw new Error('Invalid method')
    }

    const response = await fetcher<T>(
      getUrl({
        path,
        baseUrl,
        searchParams: options?.searchParams,
      }),
      reqInit
    )

    return { body: response.parsedBody as T }
  }

  return apiClient
}

const getRequestInit = (options: any): RequestInit => {
  return Object.entries(options).reduce((reducer, [key, value]) => {
    if (value != undefined) {
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
