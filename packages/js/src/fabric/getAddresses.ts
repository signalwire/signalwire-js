import { createHttpClient } from './httpClient'
interface GetAddressesParams {
  spaceHost: string
  accessToken: string
}

export const getAddresses = async ({
  spaceHost,
  accessToken,
}: GetAddressesParams) => {
  const path = '/api/fabric/addresses' as const
  const client = createHttpClient({
    baseUrl: `https://${spaceHost}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const { body } = await client<any>(path)
  const anotherPage = async (url: string) => {
    const { search } = new URL(url)
    const { body } = await client<any>(`${path}${search}`)
    return buildResult(body)
  }

  const buildResult = (body: any) => {
    return {
      addresses: body.data,
      nextPage: async () => {
        const { next } = body.links
        return next ? anotherPage(next) : undefined
      },
      prevPage: async () => {
        const { prev } = body.links
        return prev ? anotherPage(prev) : undefined
      },
    }
  }

  return buildResult(body)
}
