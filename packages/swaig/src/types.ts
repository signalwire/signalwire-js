import { FastifySwaggerUiOptions } from '@fastify/swagger-ui'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import type { JSONSchema } from 'json-schema-to-ts'

export interface Signature {
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
  description?: string
  summary?: string
  tags?: string[]
}
export interface CustomRouteHandlerResponse {
  response: string
  action?: Record<string, unknown>[]
}
export type CustomRouteHandler<T> = (
  params: T,
  extra: any
) => Promise<CustomRouteHandlerResponse>

export interface ServerOptions {
  baseUrl: string
  username?: string
  password?: string
  token?: string
  documentation?: {
    openapi?: OpenAPIV3.Document
    swagger?: OpenAPIV2.Document
    route?: string
    ui?: FastifySwaggerUiOptions
  }
}
