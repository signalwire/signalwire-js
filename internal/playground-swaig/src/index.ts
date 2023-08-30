import { SWAIG, ServerOptions } from '@signalwire/swaig'

const swaigOptions: ServerOptions = {
  baseUrl: 'http://localhost:3000',
  username: 'John Doe',
  password: 'signalwire',
  documentation: {},
}

;(async () => {
  const swaig = await SWAIG(swaigOptions)

  await swaig.addFunction(
    {
      name: 'get_location',
      purpose: 'Fetch the locations',
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
    },
    async (params, req) => {
      return {
        response: '200',
        action: [{ location: { body: req } }],
      }
    }
  )

  await swaig.addFunction(
    {
      name: 'get_date',
      purpose: 'Fetch the date',
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
    },
    async (params) => {
      return {
        response: '200',
        action: [{ foo: 'bar' }],
      }
    }
  )

  swaig.run({ port: 3000 })
})()
