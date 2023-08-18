import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner, CALL_COLLECT_PROPS, CALL_PROPS } from './utils'

const handler = async () => {
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

      tap.plan(22)

      const unsubVoice = await client.voice.listen({
        topics: ['office', 'home'],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            // Send wrong digits 123 to the caller (callee expects 1234)
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

      const call = await client.voice.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Outbound - Call resolved')

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
          onStarted: (collect) => {
            tap.hasProps(
              collect,
              CALL_COLLECT_PROPS,
              'call.collect: Collect started'
            )
            tap.equal(collect.callId, call.id, 'call.collect: Correct call id')
          },
          onInputStarted: (collect) => {
            tap.hasProps(
              collect,
              CALL_COLLECT_PROPS,
              'call.collect: Collect input started'
            )
          },
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
          onEnded: (collect) => {
            tap.hasProps(
              collect,
              CALL_COLLECT_PROPS,
              'call.collect: Collect ended'
            )
          },
        },
      })
      tap.equal(
        call.id,
        collect.callId,
        'Outbound - Collect returns the same call instance'
      )

      const unsubCollect = await collect.listen({
        onStarted: (collect) => {
          // NotOk since this listener is being attached after the call.collect promise has resolved
          tap.notOk(collect.id, 'collect.listen: Collect stared')
        },
        onInputStarted: (collect) => {
          tap.hasProps(
            collect,
            CALL_COLLECT_PROPS,
            'collect.listen: Collect input started'
          )
        },
        onUpdated: (collect) => {
          tap.hasProps(
            collect,
            CALL_COLLECT_PROPS,
            'collect.listen: Collect updated'
          )
        },
        onFailed: (collect) => {
          tap.notOk(collect.id, 'collect.listen: Collect failed')
        },
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

      console.log('Waiting for the digits from the inbound call')

      // Compare what caller has received
      const recDigits = await collect.ended()
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

      await unsubCollect()

      client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoiceCollectListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
