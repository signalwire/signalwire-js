import { __sw__Relay } from '@signalwire/realtime-api'

/**
 * Max 10 seconds to execute the script
 */
const MAX_EXECUTION_TIME = 10_000

async function main() {
  let timer: ReturnType<typeof setTimeout>

  const start = () => {
    timer = setTimeout(() => {
      console.error('RelayConsumerMessaging Timeout!')
      process.exit(2)
    }, MAX_EXECUTION_TIME)
  }

  const done = () => {
    clearTimeout(timer)
    console.log('RelayConsumerMessaging Success!')
    process.exit(0)
  }

  const host = String(process.env.RELAY_HOST)
  const project = String(process.env.RELAY_PROJECT)
  const token = String(process.env.RELAY_TOKEN)
  const contexts = ['sdk-jest', String(process.env.RELAY_CONTEXT)]
  const fromNumber = String(process.env.RELAY_FROM_NUMBER)
  const toNumber = String(process.env.RELAY_TO_NUMBER)

  const sender = new __sw__Relay.RelayConsumer({
    host,
    project,
    token,
    contexts,
    debug: {
      logWsTraffic: true,
    },
    ready: async (consumer: __sw__Relay.RelayConsumer) => {
      const result = await consumer.client.messaging.send({
        context: String(process.env.RELAY_CONTEXT),
        from: fromNumber,
        to: toNumber,
        body: 'Hello E2E',
      })

      console.log('Messaging sendResult', result)
    },
  })

  const receiver = new __sw__Relay.RelayConsumer({
    host,
    project,
    token,
    contexts,
    debug: {
      logWsTraffic: true,
    },
    onIncomingMessage: async (relayMessage: any) => {
      if (
        relayMessage.from === fromNumber &&
        relayMessage.to === toNumber &&
        relayMessage.body === 'Hello E2E'
      ) {
        done()
      }
    },
  })

  start()

  // Run both consumers
  await sender.run()
  await receiver.run()
}

main()
