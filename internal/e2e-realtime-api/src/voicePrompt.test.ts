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
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })

    let outboundPrompt:
      | Promise<Voice.VoiceCallPromptContract>
      | Voice.VoiceCallPromptContract
    let inboundSendDigits: Promise<Voice.Call> | Voice.Call | undefined
    let outboundRecDigits:
      | Promise<Voice.VoiceCallPromptContract>
      | Voice.VoiceCallPromptContract

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

        // Wait for the prompt to begin from the caller side
        await outboundPrompt

        // Send digits 1234 to the caller
        inboundSendDigits = await call.sendDigits('1w2w3w4w#')
        tap.equal(
          call.id,
          inboundSendDigits.id,
          'Inbound - sendDigit returns the same instance'
        )

        // Wait for the caller to receive digits
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

      // Caller starts a prompt
      outboundPrompt = await call.prompt({
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
        outboundPrompt.callId,
        'Outbound - Prompt returns the same instance'
      )

      // Wait for the callee to send digits
      await inboundSendDigits

      // Compare what caller has received
      outboundRecDigits = await outboundPrompt.ended()
      tap.equal(
        outboundRecDigits.digits,
        '1234',
        'Outbound - Received the same digit'
      )

      // Resolve if the call has ended or ending
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
      console.error('Outbound - voicePrompt error', error)
      reject(4)
    }
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
