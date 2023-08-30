import { SWAIG } from '@signalwire/swaig'

const swaigOptions = {
  baseUrl: 'http://localhost:3000',
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
    async (params) => {
      return {
        response: '200',
        action: [{ location: params.location }],
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
        action: [{ location: params.location }],
      }
    }
  )

  swaig.run({ port: 3000 })
})()
