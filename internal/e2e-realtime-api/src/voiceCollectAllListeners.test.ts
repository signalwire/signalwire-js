import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_COLLECT_PROPS,
  CALL_PROPS,
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

            // Send wrong digits 123 to the caller (callee expects 1234)
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
          onCollectInputStarted(collect) {
            tap.hasProps(
              collect,
              CALL_COLLECT_PROPS,
              'voice.dialSip: Collect input started'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onCollectStarted(collect) {
          tap.hasProps(
            collect,
            CALL_COLLECT_PROPS,
            'call.listen: Collect started'
          )
        },
        onCollectEnded(collect) {
          // NotOk since we unsubscribe this listener before the collect ends
          tap.notOk(collect, 'call.listen: Collect ended')
        },
      })

      // Caller starts a collect
      const collect = await call.collect({
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
        listen: {
          // onUpdated runs three times since callee sends 4 digits (1234)
          // 4th (final) digit emits onEnded
          onUpdated: (collect) => {
            tap.hasProps(
              collect,
              CALL_COLLECT_PROPS,
              'call.collect: Collect updated'
            )
          },
          onFailed: (collect) => {
            tap.notOk(collect.id, 'call.collect: Collect failed')
          },
        },
      })
      tap.equal(
        call.id,
        collect.callId,
        'Outbound - Collect returns the same call instance'
      )

      // Resolve the collect start promise
      waitForCollectStartResolve!()

      const unsubCollect = await collect.listen({
        onEnded: (_collect) => {
          tap.hasProps(
            _collect,
            CALL_COLLECT_PROPS,
            'collect.listen: Collect ended'
          )
          tap.equal(
            _collect.id,
            collect.id,
            'collect.listen: Collect correct id'
          )
        },
      })

      await unsubCall()

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

      await unsubCollect()

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoiceCollectAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect with all Listeners E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
