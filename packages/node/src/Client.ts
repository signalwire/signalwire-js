import { BaseClient, logger } from '@signalwire/core'

// TODO: reuse types from @signalwire/core
type GlobalVideoEvents = 'room.started' | 'room.ended'
export class Client extends BaseClient {
  get video() {
    return {
      createConsumer: () => {
        let subscriptions: GlobalVideoEvents[] = []
        const setSubscription = (event: GlobalVideoEvents) => {
          subscriptions = Array.from(new Set(subscriptions.concat(event)))
          return subscriptions
        }

        return {
          subscribe: (event: GlobalVideoEvents, handler: any) => {
            this.on(event, handler)
            setSubscription(event)
          },
          run: () => {
            if (subscriptions.length > 0) {
              this.execute({
                // @ts-ignore
                method: 'signalwire.subscribe',
                params: {
                  event_channel: 'rooms',
                  get_initial_state: true,
                  events: ['room.started', 'room.ended'],
                },
              })
            } else {
              logger.warn(
                '`consumer.run()` was called without any listeners attached.'
              )
            }
          },
        }
      },
    }
  }
}
