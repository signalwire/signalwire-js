import Fastify, { type FastifyInstance } from 'fastify'

type Argument = Record<string, unknown>
interface Signature {
  function: string
  purpose: string
  argument: Argument
  web_hook_url: string
  web_hook_auth_user?: string // TODO: required?
  web_hook_auth_password?: string // TODO: required?
  meta_data_token?: string // TODO: required?
}

export interface ServerRunParams {
  port?: number
  host?: string
}
export interface ServerDefineRouteParams {
  name: string
  purpose: string
  argument: Argument
  username?: string
  password?: string
  token?: string // TODO: check if needed
}
export type CustomRouteHandler<T extends unknown> = (
  params: T
) => void | Record<string, unknown>

export interface ServerOptions {
  username?: string
  password?: string
  token?: string // TODO: check if needed
}

export class Server {
  instance: FastifyInstance
  private customRoutes: Map<string, Signature>

  constructor(protected options?: ServerOptions) {
    this.instance = Fastify({
      logger: true,
    })

    this.customRoutes = new Map()
    this.defineDefaultRoutes()
  }

  public async defineRoute(
    params: ServerDefineRouteParams,
    handler: CustomRouteHandler<unknown>
  ) {
    this.appendCustomRoute(params)
    this.instance.post(`/${params.name}`, (request, _reply) => {
      return handler(request.body)
    })
  }

  public async run(params: ServerRunParams) {
    try {
      await this.instance.listen(params)
    } catch (error) {
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

  private appendCustomRoute(params: ServerDefineRouteParams) {
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
      web_hook_url: `https://example.com/foo/${params.name}`,
      web_hook_auth_user: params.username ?? this.options?.username,
      web_hook_auth_password: params.password ?? this.options?.password,
      meta_data_token: params.token ?? this.options?.token,
    })
  }

  private defineDefaultRoutes() {
    /**
     * POST / to retrieve the list of function signatures
     */
    this.instance.post('/', (_request, _reply) => {
      // TODO: check "action": "get_signature" in the body
      // TODO: filter based on "functions" in the body
      return Array.from(this.customRoutes, ([_key, value]) => {
        return value
      })
    })
  }
}
