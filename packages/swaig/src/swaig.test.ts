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
      async (params) => {
        return {
          response: '',
          action: [{ location: params.location }],
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
          return Promise.resolve({
            response: '',
            action: [{ location: params.location }],
          })
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
    const username = 'admin'
    const password = 'password'
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
        username,
        password,
        token: 'foo',
      },
      async (params, extra) => {
        return {
          response: 'Done with success',
          action: [
            {
              location: `Location is ${params.location}`,
              extra,
            },
          ],
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

    const requestBody = {
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
      foo: 'bar',
    }
    const getLocationResponse = await fetch(`${baseUrl}/get_location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(username + ':' + password).toString(
          'base64'
        )}`,
      },
      body: JSON.stringify(requestBody),
    })

    await expectResponse(getLocationResponse, {
      response: 'Done with success',
      action: [
        {
          location: 'Location is Chicago',
          extra: requestBody,
        },
      ],
    })
  })

  it('should define custom routes and return unauthorized if basic auth fails', async () => {
    expect.assertions(9)
    const username = 'admin'
    const password = 'password'

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
        username,
        password,
        token: 'foo',
      },
      async (params, extra) => {
        return {
          response: 'Done with success',
          action: [
            {
              location: `Location is ${params.location}`,
              extra,
            },
          ],
        }
      }
    )

    await instance.run({ port: 3000 })

    const requestBody = {
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
      foo: 'bar',
    }

    const tests = [
      {
        username: 'bad',
        password: 'creds',
      },
      {
        username: '',
        password: 'creds',
      },
      {
        username: 'bad',
        password: '',
      },
    ]

    for (const { username, password } of tests) {
      const response = await fetch(`${baseUrl}/get_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            username + ':' + password
          ).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      })

      expect(response.status).toBe(401)
      expect(response.headers.get('content-type')).toBe(
        'application/json; charset=utf-8'
      )
      expect(await response.json()).toEqual({
        error: 'Unauthorized',
        message: 'Unauthorized',
        statusCode: 401,
      })
    }
  })

  it('should define custom routes and allow basic auth with just username or password', async () => {
    expect.assertions(6)
    const tests = [
      {
        name: 'first',
        username: 'admin',
        password: '',
      },
      {
        name: 'second',
        username: '',
        password: 'password',
      },
    ]
    for (const { name, username, password } of tests) {
      await instance.addFunction(
        {
          name,
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
          username,
          password,
          token: 'foo',
        },
        (params, extra) => {
          return Promise.resolve({
            response: 'Done with success',
            action: [
              {
                location: `Location is ${params.location}`,
                extra,
              },
            ],
          })
        }
      )
    }

    await instance.run({ port: 3000 })

    const requestBody = {
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
      foo: 'bar',
    }

    for (const { name, username, password } of tests) {
      const response = await fetch(`${baseUrl}/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            username + ':' + password
          ).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      })

      await expectResponse(response, {
        response: 'Done with success',
        action: [
          {
            location: 'Location is Chicago',
            extra: requestBody,
          },
        ],
      })
    }
  })
})
