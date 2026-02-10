import tap from 'tap'
import { SignalWire, Voice } from '@signalwire/realtime-api'
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
      const options = {
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          logWsTraffic: true,
        },
      }

      const [client1, client2, client3] = [
        await SignalWire(options),
        await SignalWire(options),
        await SignalWire(options),
      ]

      let callPassed = false

      const handleCall = async (call: Voice.Call) => {
        if (callPassed) {
          console.log('Answering..')
          const resultAnswer = await call.answer()
          tap.ok(resultAnswer.id, 'Inbound - Call answered')
          await call.hangup()
        } else {
          console.log('Passing..')
          const passed = await call.pass()
          tap.equal(passed, undefined, 'Call passed!')
          callPassed = true
        }
      }

      const unsubClient2 = await client2.voice.listen({
        topics: [domainApp.call_relay_context],
        onCallReceived: async (call) => {
          console.log('Got call on client 2', call.id)

          try {
            await handleCall(call)
          } catch (error) {
            console.error('Inbound - voicePass client2 error', error)
            reject(4)
          }
        },
      })

      const unsubClient3 = await client3.voice.listen({
        topics: [domainApp.call_relay_context],
        onCallReceived: async (call) => {
          console.log('Got call on client 3', call.id)

          try {
            await handleCall(call)
          } catch (error) {
            console.error('Inbound - voicePass client3 error', error)
            reject(4)
          }
        },
      })

      const call = await client1.voice.dialSip({
        to: makeSipDomainAppAddress({
          name: 'to',
          domain: domainApp.domain,
        }),
        from: makeSipDomainAppAddress({
          name: 'from',
          domain: domainApp.domain,
        }),
        timeout: 30,
      })

      tap.ok(call.id, 'Call resolved')

      const waitForParams = ['ended', 'ending', ['ending', 'ended']] as const
      const results = await Promise.all(
        waitForParams.map((params) => call.waitFor(params as any))
      )
      waitForParams.forEach((value, i) => {
        if (typeof value === 'string') {
          tap.ok(results[i], `"${value}": completed successfully.`)
        } else {
          tap.ok(
            results[i],
            `${JSON.stringify(value)}: completed successfully.`
          )
        }
      })

      resolve(0)
    } catch (error) {
      console.error('VoicePass error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Pass E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
