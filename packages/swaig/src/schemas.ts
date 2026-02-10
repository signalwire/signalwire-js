import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const rootBodySchema = {
  type: 'object',
  properties: {
    project_id: { type: 'string' },
    space_id: { type: 'string' },
    version: { type: 'string', enum: ['2.0'] },
    content_type: { type: 'string' },
    content_disposition: { type: 'string' },
    functions: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    action: { type: 'string', enum: ['get_signature'] },
  },
  required: ['version', 'action', 'functions'],
} as const

export type RootBody = FromSchema<typeof rootBodySchema>

export const buildCustomRouteBodySchema = (argument: JSONSchema) => {
  const customRouteBodySchema = {
    type: 'object',
    properties: {
      app_name: { type: 'string' },
      project_id: { type: 'string' },
      space_id: { type: 'string' },
      version: { type: 'string', enum: ['2.0'] },
      content_type: { type: 'string' },
      content_disposition: { type: 'string' },
      function: { type: 'string' },
      purpose: { type: 'string' },
      argument: {
        type: 'object',
        properties: {
          parsed: {
            type: 'array',
            items: argument,
          },
          raw: { type: 'string' },
          substituted: { type: 'string' },
        },
      },
      // argument_desc: {},
      // caller_id_name: { type: 'string' },
      // caller_id_num: { type: 'string' },
      // call_id: { type: 'string' },
      // ai_session_id: { type: 'string' },
      // meta_data_token: { type: 'string' },
      // meta_data: { type: 'object' },
    },
    required: ['version', 'argument'],
  } as const

  return customRouteBodySchema
}
