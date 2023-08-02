import { SWAIG } from './swaig'

describe('SWAIG', () => {
  const baseUrl = 'http://localhost:3000'
  let instance: Awaited<ReturnType<typeof SWAIG>>

  const mockGetSignature = (body: Record<string, unknown>) => {
    return fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '2.0',
        action: 'get_signature',
        ...body,
      }),
    })
  }

  const expectResponse = async (response: Response, expectedResponse: any) => {
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8'
    )
    expect(await response.json()).toEqual(expectedResponse)
  }

  beforeEach(async () => {
    instance = await SWAIG({ baseUrl })
  })

  afterEach(() => {
    instance.close()
  })

  it('should respond to POST / with no signatures if "functions" is empty', async () => {
    expect.assertions(3)

    await instance.run({ port: 3000 })

    const response = await mockGetSignature({ functions: [] })

    await expectResponse(response, [])
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
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        } as const,
        username: 'admin',
        password: 'password',
        token: 'foo',
      },
      (params) => {
        return { location: params.location }
      }
    )

    await instance.run({ port: 3000 })

    const response = await mockGetSignature({ functions: ['get_location'] })

    await expectResponse(response, [
      {
        function: 'get_location',
        purpose: 'describe purpose of this test function',
        argument: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        },
        web_hook_url: `${baseUrl}/get_location`,
        web_hook_auth_user: 'admin',
        web_hook_auth_password: 'password',
        meta_data_token: 'foo',
      },
    ])
  })

  it('should return only the requested signatures', async () => {
    expect.assertions(3)

    for (let index = 0; index < 4; index++) {
      await instance.addFunction(
        {
          name: `fn_${index}`,
          purpose: `describe purpose of this test function ${index}`,
          argument: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'the location to get the coordinates for',
              },
            },
            required: ['location'],
            additionalProperties: false,
          } as const,
          username: `admin_${index}`,
          password: `pwd_${index}`,
          token: 'foo',
        },
        (params) => {
          return { location: params.location }
        }
      )
    }

    await instance.run({ port: 3000 })

    const response = await mockGetSignature({ functions: ['fn_0', 'fn_3'] })

    await expectResponse(response, [
      {
        function: 'fn_0',
        purpose: 'describe purpose of this test function 0',
        argument: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        },
        web_hook_url: `${baseUrl}/fn_0`,
        web_hook_auth_user: 'admin_0',
        web_hook_auth_password: 'pwd_0',
        meta_data_token: 'foo',
      },
      {
        function: 'fn_3',
        purpose: 'describe purpose of this test function 3',
        argument: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        },
        web_hook_url: `${baseUrl}/fn_3`,
        web_hook_auth_user: 'admin_3',
        web_hook_auth_password: 'pwd_3',
        meta_data_token: 'foo',
      },
    ])
  })

  it('should define custom routes and invoke user callback with the right arguments', async () => {
    expect.assertions(6)

    await instance.addFunction(
      {
        name: 'get_location',
        purpose: 'describe purpose of this test function',
        argument: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        } as const,
        username: 'admin',
        password: 'password',
        token: 'foo',
      },
      (params, extra) => {
        return {
          location: `Location is ${params.location}`,
          raw: `raw is ${extra.raw}`,
          substituted: `substituted is ${extra.substituted}`,
        }
      }
    )

    await instance.run({ port: 3000 })

    const response = await mockGetSignature({ functions: ['get_location'] })

    await expectResponse(response, [
      {
        function: 'get_location',
        purpose: 'describe purpose of this test function',
        argument: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'the location to get the coordinates for',
            },
          },
          required: ['location'],
          additionalProperties: false,
        },
        web_hook_url: `${baseUrl}/get_location`,
        web_hook_auth_user: 'admin',
        web_hook_auth_password: 'password',
        meta_data_token: 'foo',
      },
    ])

    const getLocationResponse = await fetch(`${baseUrl}/get_location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '2.0',
        function: 'get_location',
        argument: {
          parsed: [
            {
              location: 'Chicago',
            },
          ],
          raw: '{\n"location":"Chicago"\n}',
          substituted: '',
        },
      }),
    })

    await expectResponse(getLocationResponse, {
      location: 'Location is Chicago',
      raw: 'raw is {\n"location":"Chicago"\n}',
      substituted: 'substituted is ',
    })
  })
})
