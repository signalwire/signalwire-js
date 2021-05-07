import { AuthError, HttpError } from '@signalwire/core'
import { server } from '../../mocks/server'
import { createHttpClient } from './httpClient'

beforeAll(() => {
  server.listen()
})
afterAll(() => {
  server.close()
})

describe('HTTP Client', () => {
  it('should return a data object with a body prop on 200', async () => {
    const client = createHttpClient({
      baseUrl: 'http://localhost.io',
    })

    const data = await client('video/rooms/existing-id')

    expect(data).toHaveProperty('body')
  })

  it('should throw an AuthError on unauthorized requests', async () => {
    const client = createHttpClient({
      baseUrl: 'http://localhost.io',
      headers: {
        Authorization: `Basic invalid`,
      },
    })

    try {
      await client('video/rooms/an-id')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError)
    }
  })

  it('should throw an HttpError on non successfull requests', async () => {
    const client = createHttpClient({
      baseUrl: 'http://localhost.io',
    })

    try {
      await client('video/rooms/non-existing-id')
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError)
    }
  })
})
