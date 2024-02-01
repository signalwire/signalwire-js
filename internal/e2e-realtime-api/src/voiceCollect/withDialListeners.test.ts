import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_COLLECT_PROPS,
  CALL_PROPS,
  makeSipDomainAppAddress,
  TestHandler,
} from '../utils'

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

      let waitForCollectStartResolve: () => void
      const waitForCollectStart = new Promise<void>((resolve) => {
        waitForCollectStartResolve = resolve
      })
      let waitForCollectEndResolve: () => void
      const waitForCollectEnd = new Promise<void>((resolve) => {
        waitForCollectEndResolve = resolve
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

            // Wait until the caller starts the collect
            await waitForCollectStart

            // Send digits 1234 to the caller
            const sendDigits = await call.sendDigits('1w2w3w4w#')
            tap.equal(
              call.id,
              sendDigits.id,
              'Inbound - sendDigit returns the same instance'
            )

            // Wait until the caller ends the collect
            await waitForCollectEnd

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
          onCollectStarted: (collect) => {
            tap.hasProps(collect, CALL_COLLECT_PROPS, 'Collect started')
            tap.equal(collect.callId, call.id, 'Collect correct call id')
          },
          onCollectInputStarted: (collect) => {
            tap.hasProps(collect, CALL_COLLECT_PROPS, 'Collect input started')
          },
          // onCollectUpdated runs three times since callee sends 4 digits (1234)
          // 4th (final) digit emits onCollectEnded
          onCollectUpdated: (collect) => {
            tap.hasProps(collect, CALL_COLLECT_PROPS, 'Collect updated')
          },
          onCollectFailed: (collect) => {
            tap.notOk(collect.id, 'Collect failed')
          },
          onCollectEnded: (collect) => {
            tap.hasProps(collect, CALL_COLLECT_PROPS, 'Collect ended')
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Caller starts a collect
      const collect = call.collect({
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
      tap.equal(
        call.id,
        await collect.callId,
        'Outbound - Collect returns the same call instance'
      )

      // Resolve the collect start promise
      waitForCollectStartResolve!()

      console.log('Waiting for the digits from the inbound call')

      // Compare what caller has received
      const recDigits = await collect.ended()
      tap.equal(recDigits.digits, '1234', 'Outbound - Received the same digit')

      // Resolve the collect end promise
      waitForCollectEndResolve!()

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
      console.error('VoiceCollectDialListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect with Dial Listeners E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
