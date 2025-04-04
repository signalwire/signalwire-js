import {
  BaseComponentOptions,
  connect,
  JSONRPCSubscribeMethod,
  ExecuteParams,
  actions,
  EventEmitter,
  validateEventsToSubscribe,
  BaseConsumer,
} from '..'
import { getAuthorization } from '../redux/features/session/sessionSelectors'
import type {
  PubSubChannel,
  InternalPubSubChannel,
  PubSubPublishParams,
  PubSubMessageEventName,
} from '../types/pubSub'
import { PRODUCT_PREFIX_PUBSUB } from '../utils/constants'
import { PubSubMessage } from './PubSubMessage'
import { pubSubWorker } from './workers/pubSubWorker'

export type BasePubSubApiEventsHandlerMapping = Record<
  PubSubMessageEventName,
  (message: PubSubMessage) => void
>

/**
 * @privateRemarks
 *
 * Each package will have the option to either extend this
 * type or provide their own event mapping.
 */
export type BasePubSubApiEvents<T = BasePubSubApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

const toInternalPubSubChannels = (
  channels: string[]
): InternalPubSubChannel[] => {
  return channels.map((name) => {
    return {
      name,
    }
  })
}

export class BasePubSubConsumer<
  EventTypes extends EventEmitter.ValidEventTypes = BasePubSubApiEvents
> extends BaseConsumer<EventTypes> {
  protected override subscribeMethod: JSONRPCSubscribeMethod = `${PRODUCT_PREFIX_PUBSUB}.subscribe`

  constructor(options: BaseComponentOptions) {
    super(options)

    // Initialize worker through a function so that it can be override by the BaseChatConsumer
    this.initWorker()
  }

  protected initWorker() {
    this.runWorker('pubSub', { worker: pubSubWorker })
  }

  private _getChannelsParam(
    channels: string | string[] | undefined,
    method: 'subscribe' | 'unsubscribe'
  ) {
    const _channels =
      !channels || Array.isArray(channels) ? channels : [channels]

    if (!Array.isArray(_channels) || _channels.length === 0) {
      throw new Error(
        `Please specify one or more channels when calling .${method}()`
      )
    }

    return {
      channels: toInternalPubSubChannels(_channels),
    }
  }

  /** @internal */
  protected _setSubscribeParams(params: Record<string, any>) {
    this.subscribeParams = {
      ...this.subscribeParams,
      ...params,
    }
  }

  /** @internal */
  protected _getSubscribeParams({ channels }: { channels?: PubSubChannel }) {
    return {
      ...this._getChannelsParam(channels, 'subscribe'),
    }
  }

  /** @internal */
  protected _getUnsubscribeParams({ channels }: { channels?: PubSubChannel }) {
    const channelsParam = this._getChannelsParam(channels, 'unsubscribe')

    return {
      ...channelsParam,
    }
  }

  private _checkMissingSubscriptions() {
    const subscriptions = this.getSubscriptions()
    if (subscriptions.length === 0) {
      this.logger.info(
        'Subscribe was called before any listeners were attached. Move `.subscribe()` right after your event listeners to suppress this message.'
      )
      // @ts-ignore
      this.once('message', () => {})
    }
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `${PRODUCT_PREFIX_PUBSUB}.${String(event)}`
    ) as EventEmitter.EventNames<EventTypes>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }

  async subscribe(channels?: PubSubChannel) {
    this._checkMissingSubscriptions()

    const params = this._getSubscribeParams({ channels })

    this._setSubscribeParams(params)

    return super.subscribe()
  }

  async unsubscribe(channels: PubSubChannel): Promise<void> {
    if (
      this._sessionAuthStatus === 'unknown' ||
      this._sessionAuthStatus === 'unauthorized'
    ) {
      throw new Error('You must be authenticated to unsubscribe from a channel')
    }

    const params = this._getUnsubscribeParams({ channels })

    return new Promise(async (resolve, reject) => {
      const subscriptions = this.getSubscriptions()

      if (subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: `${PRODUCT_PREFIX_PUBSUB}.unsubscribe`,
          params: {
            ...params,
            events: subscriptions,
          },
        }

        try {
          await this.execute(execParams)
        } catch (error) {
          return reject(error)
        }
      } else {
        this.logger.warn(
          '`unsubscribe()` was called without any listeners attached.'
        )
      }

      return resolve()
    })
  }

  // Currently only `js` supports this features and it's
  // being ignored (filtered at the Proxy level) within
  // `realtime-api`
  updateToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.session.once('session.auth_error', (error) => {
        reject(error)
      })
      this.session.once('session.connected', () => {
        resolve()
      })

      this.store.dispatch(actions.reauthAction({ token }))
    })
  }

  publish(params: PubSubPublishParams) {
    return this.execute({
      method: `${PRODUCT_PREFIX_PUBSUB}.publish`,
      params,
    })
  }

  // Currently only `js` supports this features and it's
  // being ignored (filtered at the Proxy level) within
  // `realtime-api`
  async getAllowedChannels() {
    await this._waitUntilSessionAuthorized()
    const authorization = this.select(getAuthorization)
    if (
      authorization &&
      'channels' in authorization &&
      authorization.channels
    ) {
      return authorization.channels
    }
    return {}
  }
}

export const createBasePubSubObject = <PubSubType>(
  params: BaseComponentOptions
) => {
  const pubSub = connect<BasePubSubApiEvents, BasePubSubConsumer, PubSubType>({
    store: params.store,
    Component: BasePubSubConsumer,
  })(params)

  return pubSub
}
