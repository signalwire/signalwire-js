import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}
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

        // Send digits 1234 to the caller
        const sendDigitResult = await call.sendDigits('1w2w3w4w#')
        tap.equal(
          call.id,
          sendDigitResult.id,
          'Inbound - sendDigit returns the same instance'
        )

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

    // Start a detect
    const detect = await call.detectDigit({ digits: '1234' })

    tap.equal(
      call.id,
      detect.callId,
      'Outbound - Detect returns the same instance'
    )

    const { type } = await detect.ended()

    tap.equal(type, 'digit', 'Outbound - Received the digit')

    resolve(0)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Detect E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
