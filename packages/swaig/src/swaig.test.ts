import { SWAIG } from './swaig'

describe('SWAIG', () => {
  let instance: Awaited<ReturnType<typeof SWAIG>>

  const expectSignatures = async (response: Response, expectedResult: any) => {
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8'
    )
    expect(await response.json()).toEqual(expectedResult)
  }

  beforeEach(async () => {
    instance = await SWAIG()
  })

  afterEach(() => {
    instance.close()
  })

  it('should respond to POST / with all the signatures', async () => {
    expect.assertions(3)

    await instance.run({ port: 3000 })

    const response = await fetch('http://localhost:3000/', {
      method: 'POST',
    })
    await expectSignatures(response, [])
  })

  it('should allow to define custom routes', async () => {
    expect.assertions(3)

    await instance.addFunction(
      {
        name: 'get_location',
        purpose: 'describe purpose of this test function',
        argument: {
          type: 'object',
          properties: {
            location: {
              description: 'the location to get the coordinates for',
              type: 'string',
            },
          },
        },
        username: 'admin',
        password: 'password',
        token: 'foo',
      },
      (_params) => {
        return { result: 1 + 1 }
      }
    )

    await instance.run({ port: 3000 })

    const response = await fetch('http://localhost:3000/', {
      method: 'POST',
    })
    await expectSignatures(response, [
      {
        function: 'get_location',
        purpose: 'describe purpose of this test function',
        argument: {
          type: 'object',
          properties: {
            location: {
              description: 'the location to get the coordinates for',
              type: 'string',
            },
          },
        },
        web_hook_url: 'https://example.com/foo/get_location',
        web_hook_auth_user: 'admin',
        web_hook_auth_password: 'password',
        meta_data_token: 'foo',
      },
    ])
  })
})
