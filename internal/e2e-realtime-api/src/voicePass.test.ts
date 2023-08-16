import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const options = {
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      // logLevel: "trace",
      debug: {
        // logWsTraffic: true,
      },
    }

    const [client1, client2, client3] = [
      new Voice.Client(options),
      new Voice.Client(options),
      new Voice.Client(options),
    ]

    let callPassed = false

    const handleCall = async (call: Voice.Call) => {
      if (callPassed) {
        console.log('Answering..')
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inbound - Call answered')
        await call.hangup()
      } else {
        console.log('Passing..')
        const passed = await call.pass()
        tap.equal(passed, undefined, 'Call passed!')
        callPassed = true
      }
    }

    client2.on('call.received', async (call) => {
      console.log(
        'Got call on client 2',
        call.id,
        call.from,
        call.to,
        call.direction
      )

      try {
        await handleCall(call)
      } catch (error) {
        console.error('Inbound - voicePass client2 error', error)
        reject(4)
      }
    })

    client3.on('call.received', async (call) => {
      console.log(
        'Got call on client 3',
        call.id,
        call.from,
        call.to,
        call.direction
      )

      try {
        await handleCall(call)
      } catch (error) {
        console.error('Inbound - voicePass client3 error', error)
        reject(4)
      }
    })

    try {
      const call = await client1.dialPhone({
        // make an outbound call to an `office` context to trigger the `call.received` event above
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Call resolved')

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
      console.error('Outbound - voicePass error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Pass E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
