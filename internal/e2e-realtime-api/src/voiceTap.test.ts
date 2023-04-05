import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner, sleep } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
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

        await sleep(10000)

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    const call = await client.dialPhone({
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Outbound - Call resolved')

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
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Tap E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
