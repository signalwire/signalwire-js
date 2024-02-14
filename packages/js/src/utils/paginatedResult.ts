import { PaginatedResponse } from '@signalwire/core'
import { CreateHttpClient } from '../fabric/createHttpClient'

export function buildPaginatedResult<T>(
  body: PaginatedResponse<T>,
  client: CreateHttpClient
) {
  const anotherPage = async <T>(url: string) => {
    const { body } = await client<PaginatedResponse<T>>(url)
    return buildPaginatedResult(body, client)
  }

  return {
    data: body.data,
    nextPage: async () => {
      const { next } = body.links
      return next ? anotherPage(next) : undefined
    },
    prevPage: async () => {
      const { prev } = body.links
      return prev ? anotherPage(prev) : undefined
    },
    firstPage: async () => {
      const { first } = body.links
      return first ? anotherPage(first) : undefined
    },
    hasNext: Boolean(body.links.next),
    hasPrev: Boolean(body.links.prev),
  }
}
