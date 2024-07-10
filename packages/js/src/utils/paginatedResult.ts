import { PaginatedResponse } from '@signalwire/core'
import { CreateHttpClient } from '../fabric/createHttpClient'

export function buildPaginatedResult<T>(
  body: PaginatedResponse<T>,
  client: CreateHttpClient
) {
  const anotherPage = async (url: string) => {
    const { body } = await client<PaginatedResponse<T>>(url)
    return buildPaginatedResult<T>(body, client)
  }

  return {
    data: body.data,
    self: async () => {
      const { self } = body.links
      return self ? anotherPage(self) : Promise.resolve(undefined)
    },
    nextPage: async () => {
      const { next } = body.links
      return next ? anotherPage(next) : Promise.resolve(undefined)
    },
    prevPage: async () => {
      const { prev } = body.links
      return prev ? anotherPage(prev) : Promise.resolve(undefined)
    },
    firstPage: async () => {
      const { first } = body.links
      return first ? anotherPage(first) : Promise.resolve(undefined)
    },
    hasNext: Boolean(body.links.next),
    hasPrev: Boolean(body.links.prev),
  }
}
