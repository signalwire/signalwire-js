import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
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
    const client = new Voice.Client({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [domainApp.call_relay_context],
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })

    client.on('call.received', async (call) => {
      console.log(
        'Inbound - Got call',
        call.id,
        call.from,
        call.to,
        call.direction
      )

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inbound - Call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Inbound - Call answered gets the same instance'
        )

        // Resolve the answer promise to inform the caller
        waitForTheAnswerResolve()

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    try {
      const call = await client.dialSip({
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
      tap.ok(call.id, 'Outbound - Call resolved')

      // Wait until callee answers the call
      await waitForTheAnswer

      try {
        // Start an audio tap
        const tapAudio = await call.tapAudio({
          direction: 'both',
          device: {
            type: 'ws',
            uri: 'wss://example.domain.com/endpoint',
          },
        })

        // Tap should fail due to wrong WSS
        reject()
      } catch (error) {
        tap.ok(error, 'Outbound - Tap error')
        resolve(0)
      }

      resolve(0)
    } catch (error) {
      console.error('Outbound - voiceTap error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Tap E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
