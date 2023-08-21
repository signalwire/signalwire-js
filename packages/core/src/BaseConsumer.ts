import {
  BaseComponent,
  ExecuteParams,
  EventEmitter,
  BaseComponentOptions,
  JSONRPCSubscribeMethod,
} from '.'

/**
 * Instances of this class are meant to be wrapped by a
 * Proxy that intercepts the `_eventsNamespace` (to tell the
 * BaseComponent it's fine to attach the event listeners)
 * and the `eventChannel`
 * @internal
 */
export class BaseConsumer<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  protected subscribeMethod: JSONRPCSubscribeMethod = 'signalwire.subscribe'
  protected subscribeParams?: Record<string, any> = {}
  private _latestExecuteParams?: ExecuteParams

  constructor(public options: BaseComponentOptions) {
    super(options)
    /**
     * TODO: To Review
     * Reset _latestExecuteParams when on session connect/disconnet
     * so a reconnected client can send subscribe again.
     */
    const resetLatestExecuteParams = () => {
      this._latestExecuteParams = undefined
    }
    super.session.on('session.connected', resetLatestExecuteParams)
    super.session.on('session.disconnected', resetLatestExecuteParams)
    super.session.on('session.reconnecting', resetLatestExecuteParams)
  }

  private shouldExecuteSubscribe(execParams: ExecuteParams) {
    return (
      !this._latestExecuteParams ||
      JSON.stringify(execParams) !== JSON.stringify(this._latestExecuteParams)
    )
  }

  async subscribe() {
    await this._waitUntilSessionAuthorized()

    const subscriptions = this.getSubscriptions()

    if (subscriptions.length === 0) {
      this.logger.debug(
        '`subscribe()` was called without any listeners attached.'
      )
      return
    }

    const execParams: ExecuteParams = {
      method: this.subscribeMethod,
      params: {
        ...this.subscribeParams,
        event_channel: this.getStateProperty('eventChannel'),
        events: subscriptions,
      },
    }

    if (!this.shouldExecuteSubscribe(execParams)) {
      this.logger.debug(
        'BaseConsumer.subscribe() - Skipped .execute() since the execParams are exactly the same as last time'
      )
      return
    }

    this._latestExecuteParams = execParams
    return new Promise(async (resolve, reject) => {
      try {
        await this.execute(execParams)
        return resolve(undefined)
      } catch (error) {
        return reject(error)
      }
    })
  }
}
