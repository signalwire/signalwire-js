import Fastify, {
  FastifyRequest,
  type FastifyInstance,
  type FastifyReply,
} from 'fastify'
import FastifyBasicAuth from '@fastify/basic-auth'
import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

declare module 'fastify' {
  interface FastifyRequest {
    webHookUsername?: string
    webHookPassword?: string
  }
}

async function validate(
  username: string,
  password: string,
  req: FastifyRequest,
  _reply: FastifyReply
) {
  if (
    (req.webHookUsername && req.webHookUsername !== username) ||
    (req.webHookPassword && req.webHookPassword !== password)
  ) {
    throw new Error('Unauthorized')
  }
}

interface Signature {
  function: string
  purpose: string
  argument: JSONSchema
  web_hook_url: string
  web_hook_auth_user?: string
  web_hook_auth_password?: string
  meta_data_token?: string
}

export interface ServerRunParams {
  port?: number
  host?: string
}
export interface ServerDefineRouteParams<T extends JSONSchema> {
  name: string
  purpose: string
  argument: T
  username?: string
  password?: string
  token?: string
}
export type CustomRouteHandler<T> = (
  params: T,
  extra: any
) => void | { response: string; action: Record<string, unknown>[] } // TODO: double check

export interface ServerOptions {
  baseUrl: string
  username?: string
  password?: string
  token?: string
}

const rootBodySchema = {
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

type RootBody = FromSchema<typeof rootBodySchema>

const buildCustomRouteBodySchema = (argument: JSONSchema) => {
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

export class Server {
  instance: FastifyInstance
  private customRoutes: Map<string, Signature>

  constructor(protected options: ServerOptions) {
    this.instance = Fastify({
      logger: true,
    })
    this.instance.register(FastifyBasicAuth, { validate, authenticate: true })

    this.customRoutes = new Map()
    this.defineDefaultRoutes()
  }

  get server() {
    return this.instance
  }

  public async defineRoute<
    InputSchema extends JSONSchema,
    Body = FromSchema<InputSchema>
  >(
    params: ServerDefineRouteParams<InputSchema>,
    handler: CustomRouteHandler<Body>
  ) {
    this.appendCustomRoute(params)

    const schema = buildCustomRouteBodySchema(params.argument)

    this.instance.post<{
      Body: FromSchema<typeof schema>
      Request: { username?: string }
    }>(
      `/${params.name}`,
      {
        onRequest: (request, _reply, done) => {
          request.webHookUsername = params.username ?? this.options?.username
          request.webHookPassword = params.password ?? this.options?.password
          this.instance.basicAuth(request, _reply, done)
        },
        schema: {
          body: schema,
        } as const,
      },
      (request, _reply) => {
        const { argument } = request.body
        const { parsed } = argument
        const value = Array.isArray(parsed) ? parsed[0] : undefined
        return handler(value as Body, request.body)
      }
    )
  }

  public async run(params: ServerRunParams) {
    try {
      await this.instance.ready()

      await this.instance.listen(params)
    } catch (error) {
      console.log('error', error)
      this.instance.log.error(error, 'Error running the server.')
      process.exit(1)
    }
  }

  public async close() {
    try {
      await this.instance.close()
    } catch (error) {
      this.instance.log.error(error, 'Error closing the server.')
      process.exit(1)
    }
  }

  private appendCustomRoute<InputSchema extends JSONSchema>(
    params: ServerDefineRouteParams<InputSchema>
  ) {
    if (this.customRoutes.has(params.name)) {
      this.instance.log.warn(
        params,
        `The function name ${params.name} has already been defined and will be overwritten`
      )
    }

    this.customRoutes.set(params.name, {
      function: params.name,
      purpose: params.purpose,
      argument: params.argument,
      web_hook_url: `${this.options?.baseUrl}/${params.name}`,
      web_hook_auth_user: params.username ?? this.options?.username,
      web_hook_auth_password: params.password ?? this.options?.password,
      meta_data_token: params.token ?? this.options?.token,
    })
  }

  private defineDefaultRoutes() {
    /**
     * POST / to retrieve the list of function signatures
     */
    this.instance.post<{ Body: RootBody }>(
      '/',
      {
        schema: {
          body: rootBodySchema,
        },
      },
      (request, _reply) => {
        const result = []
        for (const fn of request.body.functions) {
          if (this.customRoutes.has(fn)) {
            result.push(this.customRoutes.get(fn))
          }
        }

        return result
      }
    )
  }
}
