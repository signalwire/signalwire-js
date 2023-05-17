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

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })

    let inboundSendDigits: Promise<Voice.Call> | Voice.Call | undefined
    let outboundRecDigits:
      | Promise<Voice.VoiceCallDetectContract>
      | Voice.VoiceCallDetectContract

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

        // Send digits 1234 to the caller
        inboundSendDigits = await call.sendDigits('1w2w3w4w#')
        tap.equal(
          call.id,
          inboundSendDigits.id,
          'Inbound - sendDigit returns the same instance'
        )

        // Wait until the caller receives digits
        await outboundRecDigits

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

      // Wait until callee answers the call
      await waitForTheAnswer

      // Start a detect
      const detectDigit = await call.detectDigit({ digits: '1234' })
      tap.equal(
        call.id,
        detectDigit.callId,
        'Outbound - Detect returns the same instance'
      )

      // Wait until the callee send the digits
      await inboundSendDigits

      outboundRecDigits = await detectDigit.ended()
      tap.equal(
        outboundRecDigits.type,
        'digit',
        'Outbound - Received the digit'
      )

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
