import tap from 'tap'
import { SignalWire, Voice } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PROMPT_PROPS,
  CALL_PROPS,
  CALL_PLAYBACK_PROPS,
  TestHandler,
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
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            // Send digits 1234 to the caller
            const sendDigits = await call.sendDigits('1w2w3w4w#')
            tap.equal(
              call.id,
              sendDigits.id,
              'Inbound - sendDigit returns the same instance'
            )

            await call.hangup()
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

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
          onPlaybackStarted: (playback) => {
            tap.hasProps(playback, CALL_PLAYBACK_PROPS, 'Playback started')
          },
          onPromptStarted: (prompt) => {
            tap.hasProps(prompt, CALL_PROMPT_PROPS, 'Prompt started')
          },
          onPromptUpdated: (prompt) => {
            tap.notOk(prompt.id, 'Prompt updated')
          },
          onPromptFailed: (prompt) => {
            tap.notOk(prompt.id, 'Prompt failed')
          },
          onPromptEnded: (prompt) => {
            tap.hasProps(prompt, CALL_PROMPT_PROPS, 'Prompt ended')
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Caller starts a prompt
      const prompt = await call
        .prompt({
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
        .onStarted()

      tap.equal(
        call.id,
        prompt.callId,
        'Outbound - Prompt returns the same call instance'
      )

      console.log('Waiting for the digits from the inbound call')

      // Compare what caller has received
      const recDigits = await prompt.ended()
      tap.equal(recDigits.digits, '1234', 'Outbound - Received the same digit')

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

      await unsubVoice()

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoicePromptDialListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Prompt with Dial Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
