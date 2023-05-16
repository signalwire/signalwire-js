import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'
import { VoiceCallCollectContract } from '@signalwire/core'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      // logLevel: "trace",
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })

    let outboundSendDigits: Promise<Voice.Call> | Voice.Call
    let inboundCollectDigits:
      | Promise<VoiceCallCollectContract>
      | VoiceCallCollectContract
      | undefined

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

        // Resolve the answer promise to let the caller know
        await waitForTheAnswerResolve()

        call.on('collect.started', (collect) => {
          console.log('>>> collect.started')
        })
        call.on('collect.updated', (collect) => {
          console.log('>>> collect.updated', collect.digits)
        })
        call.on('collect.ended', (collect) => {
          console.log('>>> collect.ended', collect.digits)
        })
        call.on('collect.failed', (collect) => {
          console.log('>>> collect.failed', collect.reason)
        })

        // Collects digits from the caller
        inboundCollectDigits = await call.collect({
          initialTimeout: 4.0,
          digits: {
            max: 4,
            digitTimeout: 10,
            terminators: '#',
          },
          partialResults: true,
          continuous: false,
          sendStartOfInput: true,
          startInputTimers: false,
        })

        // Wait until the caller completes sending digits
        await outboundSendDigits

        // End the digit collection
        await inboundCollectDigits.ended()
        tap.equal(
          inboundCollectDigits.digits,
          '123',
          'Collect the correct digits'
        )

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Error', error)
        reject(4)
      }
    })

    const call = await client.dialPhone({
      // make an outbound call to an `office` context to trigger the `call.received` event above
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Call resolved')

    // Wait until callee answers the call
    await waitForTheAnswer

    // Wait until callee stars listening for the digits
    await inboundCollectDigits

    // Send digits 1234 to the callee
    outboundSendDigits = await call.sendDigits('1w2w3w#')
    tap.equal(
      call.id,
      outboundSendDigits.id,
      'sendDigit returns the same instance'
    )

    // Wait until callee hangs up the call
    const waitForParams = ['ended', 'ending', ['ending', 'ended']] as const
    const results = await Promise.all(
      waitForParams.map((params) => call.waitFor(params as any))
    )
    waitForParams.forEach((value, i) => {
      if (typeof value === 'string') {
        tap.ok(results[i], `"${value}": completed successfully.`)
      } else {
        tap.ok(results[i], `${JSON.stringify(value)}: completed successfully.`)
      }
    })

    resolve(0)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
