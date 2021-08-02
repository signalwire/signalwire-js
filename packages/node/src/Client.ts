import {
  BaseClient,
  ExecuteParams,
  logger,
  SessionState,
  GlobalVideoEvents,
  EventTransform,
} from '@signalwire/core'

interface Consumer {
  subscribe: (event: GlobalVideoEvents, handler: any) => void
  run: () => Promise<unknown>
}
export class Client extends BaseClient {
  private _consumers: Consumer[] = []

  // TODO: Remove: This is just for demo purposes. We'll remove it
  // until we have the logic for instantiating Room objects
  _emitterTransforms = new Map<GlobalVideoEvents, EventTransform>([
    [
      'room.started',
      (handler: any) => (payload) => {
        /**
         * Note: `handler` is the function used by the user to register to the event.
         * For now this transform is not doing anything with the
         * payload, but we could do anything we want before calling
         * the `handler`.
         */
        return handler(payload)
      },
    ],
  ])

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized' && session.authCount > 1) {
      this._consumers.forEach((consumer) => {
        consumer.run()
      })
    }
  }

  get video() {
    return {
      createConsumer: () => {
        let subscriptions: GlobalVideoEvents[] = []
        const setSubscription = (event: GlobalVideoEvents) => {
          subscriptions = Array.from(new Set(subscriptions.concat(event)))
          return subscriptions
        }

        const consumer: Consumer = {
          subscribe: (event: GlobalVideoEvents, handler: any) => {
            this.on(event, handler)
            setSubscription(event)
          },
          run: () => {
            return new Promise(async (resolve, reject) => {
              if (subscriptions.length > 0) {
                const execParams: ExecuteParams = {
                  method: 'signalwire.subscribe',
                  params: {
                    event_channel: 'rooms',
                    get_initial_state: true,
                    events: subscriptions,
                  },
                }

                try {
                  await this.execute(execParams)
                } catch (error) {
                  return reject(error)
                }
              } else {
                logger.warn(
                  '`consumer.run()` was called without any listeners attached.'
                )
              }

              return resolve(undefined)
            })
          },
        }

        this._consumers.push(consumer)

        return consumer
      },
    }
  }
}
