/**
 * Developers should be able to measure the time it takes the callee to pick up an outbound call.
 */
import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

const handler: TestHandler = ({ domainApp }) => {
  if (!domainApp) {
    throw new Error('Missing domainApp')
  }
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          logWsTraffic: true,
        },
      })

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context, 'home'],
        onCallReceived: async (call) => {
          try {
            await call.answer()

            await call.hangup()
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

      let miliSeconds = 0
      // Start a timer in miliseconds
      const timer = setInterval(() => miliSeconds++, 100)

      const call = await client.voice.dialSip({
        to: makeSipDomainAppAddress({
          name: 'to',
          domain: domainApp.domain,
        }),
        from: makeSipDomainAppAddress({
          name: 'from',
          domain: domainApp.domain,
        }),
        timeout: 30,
        listen: {
          async onStateChanged(call) {
            // If the call has answered; stop the timer and print the time.
            if (call.state === 'answered') {
              clearInterval(timer)

              tap.ok(miliSeconds, 'MiliSeconds')
              console.log(miliSeconds)
            }

            // If the call has ended (hangup by the callee) disconnect the client
            if (call.state === 'ended') {
              await client.disconnect()
              resolve(0)
            }
          },
        },
      })
    } catch (error) {
      console.error('VoicePickupLatency error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice VoicePickupLatency E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
