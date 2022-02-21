import { Compat } from '@signalwire/realtime-api'

/**
 * Max 10 seconds to execute the script
 */
const MAX_EXECUTION_TIME = 10_000

async function main() {
  let timer: ReturnType<typeof setTimeout>

  const start = () => {
    timer = setTimeout(() => {
      console.error('RelayConsumerTask Timeout!')
      process.exit(2)
    }, MAX_EXECUTION_TIME)
  }

  const done = () => {
    clearTimeout(timer)
    console.log('RelayConsumerTask Success!')
    process.exit(0)
  }

  const host = String(process.env.RELAY_HOST)
  const project = String(process.env.RELAY_PROJECT)
  const token = String(process.env.RELAY_TOKEN)
  const contexts = ['sdk-jest', String(process.env.RELAY_CONTEXT)]

  const consumer = new Compat.RelayConsumer({
    host,
    project,
    token,
    contexts,
    debug: {
      logWsTraffic: true,
    },
    onTask: async (message: any) => {
      if (message.foo === 'baz') {
        done()
      }
    },
  })

  start()

  // Run consumer
  await consumer.run()

  // Deliver task to it
  const task = new Compat.Task(project, token)
  await task.deliver(String(process.env.RELAY_CONTEXT), { foo: 'baz' })
}

main()
