import Fastify, { type FastifyInstance } from 'fastify'
import FastifyBasicAuth from '@fastify/basic-auth'
import FastifySwagger from '@fastify/swagger'
import FastifySwaggerUI from '@fastify/swagger-ui'
import type { FromSchema, JSONSchema } from 'json-schema-to-ts'
import type {
  Signature,
  ServerOptions,
  ServerDefineRouteParams,
  CustomRouteHandler,
  ServerRunParams,
} from './types'
import {
  rootBodySchema,
  type RootBody,
  buildCustomRouteBodySchema,
} from './schemas'
import { fetchSWLogo, validate } from './utils'
import { version } from '../package.json'

declare module 'fastify' {
  interface FastifyRequest {
    webHookUsername?: string
    webHookPassword?: string
  }
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
          if (request.webHookUsername || request.webHookPassword) {
            return this.instance.basicAuth(request, _reply, done)
          }
          return done()
        },
        schema: {
          tags: params.tags ?? ['custom'],
          summary: params.summary,
          description: params.description,
          body: schema,
        } as const,
      },
      async (request, _reply) => {
        this.instance.log.info({ body: request.body }, `${params.name} body`)
        const { argument } = request.body
        const { parsed } = argument
        const value = Array.isArray(parsed) ? parsed[0] : undefined
        this.instance.log.info(
          { value },
          `${params.name} invoking handler with value`
        )
        const result = await handler(value as Body, request.body)
        this.instance.log.info({ result }, `${params.name} result`)
        return result
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
          tags: ['default'],
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

  private async registerSwagger() {
    await this.instance.register(FastifySwagger, {
      openapi: {
        info: {
          title: 'SWAIG',
          description: 'SignalWire AI Gateway routes documentation',
          version,
          ...this.options.documentation?.openapi?.info,
        },
        externalDocs: {
          url: 'https://developer.signalwire.com/compatibility-api/xml/voice/ai-noun/#swaig-signalwire-ai-gateway',
          description: 'Find more information about SWAIG',
          ...this.options.documentation?.openapi?.externalDocs,
        },
        tags: [
          { name: 'default', description: 'All function signatures' },
          { name: 'custom', description: 'Custom function signatures' },
          ...(this.options.documentation?.openapi?.tags || []),
        ],
        servers: [
          { url: this.options.baseUrl },
          ...(this.options.documentation?.openapi?.servers || []),
        ],
        ...this.options.documentation?.openapi,
      },
    })

    const logo = await fetchSWLogo()

    await this.instance.register(FastifySwaggerUI, {
      routePrefix: this.options.documentation?.route ?? '/',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        ...this.options.documentation?.ui?.uiConfig,
      },
      staticCSP: true,
      theme: {
        title: 'SWAIG Documentation',
        css: [
          {
            filename: 'theme.css',
            content: `
              .swagger-ui .topbar .download-url-wrapper input[type=text] { border: 1px solid #044ef4 }
              .swagger-ui .topbar .download-url-wrapper .download-url-button { background: #044ef4; }
            `,
          },
          ...(this.options.documentation?.ui?.theme?.css || []),
        ],
        favicon: [
          {
            filename: 'favicon.png',
            rel: 'icon',
            sizes: '16x16',
            type: 'image/png',
            content: logo as Buffer,
          },
          ...(this.options.documentation?.ui?.theme?.favicon || []),
        ],
        ...this.options.documentation?.ui?.theme,
      },
      logo: {
        type: 'image/svg+xml',
        content: logo as Buffer,
        ...this.options.documentation?.ui?.logo,
      },
      ...this.options.documentation?.ui,
    })
  }

  /** @internal */
  async init() {
    if (this.options.documentation) {
      await this.registerSwagger()
    }
    this.defineDefaultRoutes()
  }
}
