import Fastify, { type FastifyInstance } from 'fastify'
import { type FromSchema, type JSONSchema } from 'json-schema-to-ts'

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
  token?: string // TODO: check if needed
}
export type CustomRouteHandler<T> = (
  params: T
) => void | Record<string, unknown>

export interface ServerOptions {
  baseUrl: string
  username?: string
  password?: string
  token?: string // TODO: check if needed
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

export class Server {
  instance: FastifyInstance
  private customRoutes: Map<string, Signature>

  constructor(protected options: ServerOptions) {
    this.instance = Fastify({
      logger: true,
    })

    this.customRoutes = new Map()
    this.defineDefaultRoutes()
  }

  public async defineRoute<
    InputSchema extends JSONSchema,
    Body = FromSchema<InputSchema>
  >(
    params: ServerDefineRouteParams<InputSchema>,
    handler: CustomRouteHandler<Body>
  ) {
    this.appendCustomRoute(params)

    this.instance.post<{ Body: Body }>(
      `/${params.name}`,
      {
        schema: {
          body: params.argument,
        } as const,
      },
      (request, _reply) => {
        return handler(request.body as Body)
      }
    )
  }

  public async run(params: ServerRunParams) {
    try {
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
