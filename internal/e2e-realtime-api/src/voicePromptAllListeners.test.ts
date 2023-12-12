import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PROPS,
  CALL_PROMPT_PROPS,
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
          // logWsTraffic: true,
        },
      })

      const unsubVoiceOffice = await client.voice.listen({
        topics: [domainApp.call_relay_context],
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

      const unsubVoiceHome = await client.voice.listen({
        topics: ['home'],
        // This should never run since VOICE_DIAL_TO_NUMBER is listening only for "office" topic
        onCallReceived: async (call) => {
          tap.notOk(call, 'Inbound - Home topic received a call')
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
          onPromptStarted: (prompt) => {
            tap.hasProps(
              prompt,
              CALL_PROMPT_PROPS,
              'voice.dialPhone: Prompt started'
            )
          },
          onPromptUpdated: (prompt) => {
            tap.notOk(prompt.id, 'voice.dialPhone: Prompt updated')
          },
          onPromptFailed: (prompt) => {
            tap.notOk(prompt.id, 'voice.dialPhone: Prompt failed')
          },
          onPromptEnded: (prompt) => {
            tap.hasProps(
              prompt,
              CALL_PROMPT_PROPS,
              'voice.dialPhone: Prompt ended'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onPromptStarted: (prompt) => {
          tap.hasProps(prompt, CALL_PROMPT_PROPS, 'call.listen: Prompt started')
        },
        onPromptUpdated: (prompt) => {
          tap.notOk(prompt.id, 'call.listen: Prompt updated')
        },
        onPromptFailed: (prompt) => {
          tap.notOk(prompt.id, 'call.listen: Prompt failed')
        },
        onPromptEnded: (prompt) => {
          // NotOk since we unsubscribe this listener before the prompt stops
          tap.notOk(prompt.id, 'call.listen: Prompt ended')
        },
      })

      const prompt = await call
        .promptRingtone({
          name: 'it',
          duration: 10,
          digits: {
            max: 5,
            digitTimeout: 2,
            terminators: '#*',
          },
          listen: {
            onStarted: (prompt) => {
              tap.hasProps(
                prompt,
                CALL_PROMPT_PROPS,
                'call.promptRingtone: Prompt started'
              )
            },
            onUpdated: (prompt) => {
              tap.notOk(prompt.id, 'call.promptRingtone: Prompt updated')
            },
            onFailed: (prompt) => {
              tap.notOk(prompt.id, 'call.promptRingtone: Prompt failed')
            },
            onEnded: (_prompt) => {
              tap.hasProps(
                _prompt,
                CALL_PROMPT_PROPS,
                'call.promptRingtone: Prompt ended'
              )
              tap.equal(
                _prompt.id,
                prompt.id,
                'call.promptRingtone: Prompt correct id'
              )
            },
          },
        })
        .onStarted()

      const unsubPrompt = await prompt.listen({
        onStarted: (prompt) => {
          // NotOk since the listener is attached after the call.prompt has resolved
          tap.notOk(prompt.id, 'prompt.listen: Prompt stared')
        },
        onUpdated: (prompt) => {
          tap.notOk(prompt.id, 'prompt.listen: Prompt updated')
        },
        onFailed: (prompt) => {
          tap.notOk(prompt.id, 'prompt.listen: Prompt failed')
        },
        onEnded: (_prompt) => {
          tap.hasProps(
            _prompt,
            CALL_PROMPT_PROPS,
            'prompt.listen: Prompt ended'
          )
          tap.equal(_prompt.id, prompt.id, 'prompt.listen: Prompt correct id')
        },
      })

      await unsubCall()

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

      await unsubVoiceOffice()

      await unsubVoiceHome()

      await unsubPrompt()

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoicePromptAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Prompt with all Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
