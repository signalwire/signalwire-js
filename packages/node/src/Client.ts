import {
  BaseClient,
  ExecuteParams,
  logger,
  SessionState,
  selectors,
} from '@signalwire/core'

// TODO: reuse types from @signalwire/core
type GlobalVideoEvents = 'room.started' | 'room.ended'

type DeferredExecutionItem = [
  ExecuteParams,
  { resolve: (value: unknown) => void; reject: (reason?: any) => void }
]
export class Client extends BaseClient {
  private _executionQueue: DeferredExecutionItem[] = []

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      for (const [execParams, { resolve, reject }] of this._executionQueue) {
        try {
          await this.execute(execParams)
          resolve(undefined)
        } catch (error) {
          reject(error)
        }
      }
    } else if (this._executionQueue.length > 0) {
      logger.warn(
        `The Client couldn't authenticate and some operations remain unexecuted.`
      )
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

                /**
                 * If the user is authorized we'll execute the action
                 * right away. Otherwise we'll put the execute in a
                 * queue and run it as soon as we detect the
                 * `session.authStatus === 'authorized'`
                 */
                if (this.select(selectors.getAuthStatus) === 'authorized') {
                  try {
                    await this.execute(execParams)
                  } catch (error) {
                    return reject(error)
                  }
                } else {
                  return this._executionQueue.push([
                    execParams,
                    { resolve, reject },
                  ])
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
      },
    }
  }
}
