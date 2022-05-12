import type { OnlyStateProperties, OnlyFunctionProperties, CamelToSnakeCase, SwEvent } from '..'
import { PRODUCT_PREFIX_PUBSUB } from '../utils/constants'

export type PubSubPagingCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

type ToInternalPubSubEvent<T extends string> = `${PubSubNamespace}.${T}`
export type PubSubNamespace = typeof PRODUCT_PREFIX_PUBSUB

export type PubSubMessageEventName = 'message'

export type PubSubEventNames = PubSubMessageEventName

export type PubSubChannel = string | string[]

export interface PubSubPublishParams {
  content: any
  channel: string
  meta?: Record<any, any>
}

export interface PubSubContract {
  updateToken(token: string): Promise<void>
  subscribe(channels: PubSubChannel): Promise<void>
  unsubscribe(channels: PubSubChannel): Promise<void>
  publish(params: PubSubPublishParams): Promise<void>
}

export type PubSubEntity = OnlyStateProperties<PubSubContract>
export type PubSubMethods = Omit<
  OnlyFunctionProperties<PubSubContract>,
  'subscribe' | 'unsubscribe' | 'updateToken'
>

export interface PubSubMessageContract {
  id: string
  channel: string
  content: any
  publishedAt: Date
  meta?: any
}

export type PubSubMessageEntity = OnlyStateProperties<PubSubMessageContract>

export type InternalPubSubMessageEntity = {
  [K in NonNullable<
    keyof PubSubMessageEntity
  > as CamelToSnakeCase<K>]: PubSubMessageEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'chat.channel.message'
 */
 export interface PubSubChannelMessageEventParams {
  channel: string
  message: InternalPubSubMessageEntity
}

export interface PubSubChannelMessageEvent extends SwEvent {
  event_type: ToInternalPubSubEvent<PubSubMessageEventName>
  params: PubSubChannelMessageEventParams
}

export interface InternalPubSubChannel {
  name: string
}

export type PubSubJSONRPCMethod =
  | 'chat.subscribe'
  | 'chat.publish'
  | 'chat.unsubscribe'

