import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

const handler: TestHandler = ({ domainApp }) => {
  if (!domainApp) {
    throw new Error('Missing domainApp')
  }
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      topics: [domainApp.call_relay_context],
      debug: {
        logWsTraffic: false,
      },
    })

    let waitForCallAnswerResolve: (value: void) => void
    const waitForCallAnswer = new Promise((resolve) => {
      waitForCallAnswerResolve = resolve
    })
    let waitForPromptStartResolve
    const waitForPromptStart = new Promise((resolve) => {
      waitForPromptStartResolve = resolve
    })
    let waitForSendDigitsResolve: (value: void) => void
    const waitForSendDigits = new Promise((resolve) => {
      waitForSendDigitsResolve = resolve
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

        // Resolve the answer promise to inform the caller
        waitForCallAnswerResolve()

        // Wait for the prompt to begin from the caller side
        await waitForPromptStart

        // Send digits 1234 to the caller
        const sendDigits = await call.sendDigits('1w2w3w4w#')
        tap.equal(
          call.id,
          sendDigits.id,
          'Inbound - sendDigit returns the same instance'
        )

        // Resolve the send digits promise to inform the caller
        waitForSendDigitsResolve()

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    try {
      const call = await client.dialSip({
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

      // Wait until callee answers the call
      await waitForCallAnswer

      // Caller starts a prompt
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

      // Resolve the prompt promise to inform the callee
      waitForPromptStartResolve()

      // Wait for the callee to send digits
      await waitForSendDigits

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
    useDomainApp: true,
  })

  await runner.run()
}

main()
