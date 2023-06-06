import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
    })

    let waitForDetectStartResolve
    const waitForDetectStart = new Promise((resolve) => {
      waitForDetectStartResolve = resolve
    })
    let waitForDetectEndResolve: (value: void) => void
    const waitForDetectEnd = new Promise((resolve) => {
      waitForDetectEndResolve = resolve
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

        // Wait until caller starts detecting digit
        await waitForDetectStart

        // Send digits 1234 to the caller
        const sendDigits = await call.sendDigits('1w2w3w4w#')
        tap.equal(
          call.id,
          sendDigits.id,
          'Inbound - sendDigit returns the same instance'
        )

        // Resolve the detect end promise to inform the caller
        waitForDetectEndResolve()

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    try {
      const call = await client.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Start a detect
      const detectDigit = await call.detectDigit({ digits: '1234' })
      tap.equal(
        call.id,
        detectDigit.callId,
        'Outbound - Detect returns the same instance'
      )

      // Resolve the detect start promise to inform the callee
      waitForDetectStartResolve()

      // Wait until the callee sends the digits
      await waitForDetectEnd

      const recDigits = await detectDigit.ended()
      tap.equal(recDigits.type, 'digit', 'Outbound - Received the digit')

      resolve(0)
    } catch (error) {
      console.error('Outbound - voiceDetect error', error)
      reject(4)
    }
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
