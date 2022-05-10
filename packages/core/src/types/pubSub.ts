import type { OnlyStateProperties, OnlyFunctionProperties } from '..'
import { PRODUCT_PREFIX_PUBSUB } from '../utils/constants'

export type PubSubCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

export type PubSubNamespace = typeof PRODUCT_PREFIX_PUBSUB

export type PubSubEventNames = ''

export type PubSubChannel = string | string[]

export interface PubSubPublishParams {
  content: any
  channel: string
  meta?: Record<any, any>
}

export interface ChatContract {
  updateToken(token: string): Promise<void>
  subscribe(channels: PubSubChannel): Promise<void>
  unsubscribe(channels: PubSubChannel): Promise<void>
  publish(params: PubSubPublishParams): Promise<void>
}

export type PubSubEntity = OnlyStateProperties<ChatContract>
export type PubSubMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe' | 'unsubscribe' | 'updateToken'
>

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

export interface InternalPubSubChannel {
  name: string
}

export type PubSubJSONRPCMethod =
  | 'chat.subscribe'
  | 'chat.publish'
  | 'chat.unsubscribe'

