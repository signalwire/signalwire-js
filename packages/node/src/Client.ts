import {
  BaseClient,
  ExecuteParams,
  logger,
  SessionState,
  selectors,
} from '@signalwire/core'

// TODO: reuse types from @signalwire/core
type GlobalVideoEvents = 'room.started' | 'room.ended'
export class Client extends BaseClient {
  private _executionQueue = new Set<ExecuteParams>()

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._executionQueue.forEach((execParams) => {
        this.execute(execParams)
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

        return {
          subscribe: (event: GlobalVideoEvents, handler: any) => {
            this.on(event, handler)
            setSubscription(event)
          },
          run: () => {
            if (subscriptions.length > 0) {
              const execParams: ExecuteParams = {
                method: 'signalwire.subscribe',
                params: {
                  event_channel: 'rooms',
                  get_initial_state: true,
                  events: subscriptions,
                },
              }

              /**
               * If the user is authorized we'll execute the action
               * right away. Otherwise we'll put the execute in a
               * queue and run it as soon as we detect the
               * `session.authStatus === 'authorized'`
               */
              if (this.select(selectors.getAuthStatus) === 'authorized') {
                this.execute(execParams)
              } else {
                this._executionQueue.add(execParams)
              }
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
