import { __sw__Relay } from '@signalwire/realtime-api'

/**
 * Max 10 seconds to execute the script
 */
const MAX_EXECUTION_TIME = 10_000

async function main() {
  let timer: ReturnType<typeof setTimeout>

  const start = () => {
    timer = setTimeout(() => {
      console.error('RelayConsumerCalling Timeout!')
      process.exit(2)
    }, MAX_EXECUTION_TIME)
  }

  const done = () => {
    clearTimeout(timer)
    console.log('RelayConsumerCalling Success!')
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
      const { successful, call } = await consumer.client.calling.dial({
        type: 'phone',
        from: fromNumber,
        to: toNumber,
      })

      if (successful) {
        await call.waitForEnding()
        await call.waitForEnded()

        done()
      }
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
    onIncomingCall: async (relayCall: any) => {
      if (relayCall.from === fromNumber && relayCall.to === toNumber) {
        await relayCall.answer()
        // TODO: Add other logic here
        await relayCall.hangup()
      }
    },
  })

  start()

  // Run both consumers
  receiver.run()
  sender.run()
}

main()
