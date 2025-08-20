// Placeholder interfaces for removed unified module
interface PaginatedResponse<T> {
  data: T[]
  links: {
    self?: string
    next?: string
    prev?: string
    first?: string
  }
}

type CreateHttpClient = <T>(url: string) => Promise<{ body: T }>

export function buildPaginatedResult<T>(
  body: PaginatedResponse<T>,
  client: CreateHttpClient
) {
  const anotherPage = async (url?: string) => {
    if (!url) return Promise.resolve(undefined)
    const { body } = await client<PaginatedResponse<T>>(url)
    return buildPaginatedResult<T>(body, client)
  }

  return {
    data: body.data,
    self: async () => {
      const { self } = body.links
      return anotherPage(self)
    },
    nextPage: async () => {
      const { next } = body.links
      return anotherPage(next)
    },
    prevPage: async () => {
      const { prev } = body.links
      return anotherPage(prev)
    },
    firstPage: async () => {
      const { first } = body.links
      return anotherPage(first)
    },
    hasNext: Boolean(body.links.next),
    hasPrev: Boolean(body.links.prev),
  }
}
