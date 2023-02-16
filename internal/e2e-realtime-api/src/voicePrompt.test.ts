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

    // Start a prompt
    const prompt = await call.prompt({
      playlist: new Voice.Playlist({ volume: 1.0 }).add(
        Voice.Playlist.TTS({
          text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
        })
      ),
      digits: {
        max: 4,
        digitTimeout: 10,
        terminators: '#',
      },
    })

    tap.equal(
      call.id,
      prompt.callId,
      'Outbound - Prompt returns the same instance'
    )

    const { digits } = await prompt.ended()

    tap.equal(digits, '1234', 'Outbound - Received the same digit')

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
    name: 'Voice Prompt E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
