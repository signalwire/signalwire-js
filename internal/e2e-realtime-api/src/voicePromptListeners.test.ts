import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PLAYBACK_PROPS,
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
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const prompt = call.promptTTS({
        text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
        digits: {
          max: 4,
          digitTimeout: 10,
          terminators: '#',
        },
        listen: {
          onStarted: (prompt) => {
            tap.hasProps(
              prompt,
              CALL_PROMPT_PROPS,
              'call.promptTTS: Prompt started'
            )
          },
          onUpdated: (_prompt) => {
            tap.notOk(_prompt.id, 'call.promptTTS: Prompt updated')
          },
          onFailed: (_prompt) => {
            tap.notOk(_prompt.id, 'call.promptTTS: Prompt failed')
          },
          onEnded: async (_prompt) => {
            tap.hasProps(
              _prompt,
              CALL_PROMPT_PROPS,
              'call.promptTTS: Prompt ended'
            )
            tap.equal(
              _prompt.id,
              await prompt.id,
              'call.promptTTS: Prompt correct id'
            )
          },
        },
      })
      tap.equal(
        call.id,
        await prompt.callId,
        'Outbound - Prompt returns the same call instance'
      )

      const unsubPrompt = await prompt.listen({
        onStarted: (prompt) => {
          // NotOk since this listener is being attached after the call.prompt promise has resolved
          tap.notOk(prompt.id, 'prompt.listen: Prompt stared')
        },
        onUpdated: (prompt) => {
          tap.notOk(prompt.id, 'prompt.listen: Prompt updated')
        },
        onFailed: (prompt) => {
          tap.notOk(prompt.id, 'prompt.listen: Prompt failed')
        },
        onEnded: async (_prompt) => {
          tap.hasProps(
            _prompt,
            CALL_PROMPT_PROPS,
            'prompt.listen: Prompt ended'
          )
          tap.equal(
            _prompt.id,
            await prompt.id,
            'prompt.listen: Prompt correct id'
          )
        },
      })

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

      await unsubPrompt()

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoicePromptListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Prompt Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
