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
      contexts: [domainApp.call_relay_context],
      // logLevel: "trace",
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForCollectStartResolve
    const waitForCollectStart = new Promise((resolve) => {
      waitForCollectStartResolve = resolve
    })
    let waitForCollectEndResolve
    const waitForCollectEnd = new Promise((resolve) => {
      waitForCollectEndResolve = resolve
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

        call.on('collect.started', (collect) => {
          console.log('>>> collect.started')
        })
        call.on('collect.updated', (collect) => {
          console.log('>>> collect.updated', collect.digits)
        })
        call.on('collect.ended', (collect) => {
          console.log('>>> collect.ended', collect.digits)
        })
        call.on('collect.failed', (collect) => {
          console.log('>>> collect.failed', collect.reason)
        })
        // call.on('collect.startOfSpeech', (collect) => {})

        const callCollect = await call.collect({
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

        // Resolve the answer promise to inform the caller
        waitForCollectStartResolve()

        // Wait until the caller ends entring the digits
        await waitForCollectEnd

        await callCollect.ended() // block the script until the collect ended

        tap.equal(callCollect.digits, '123', 'Collect the correct digits')
        // await callCollect.stop()
        // await callCollect.startInputTimers()

        await call.hangup()
      } catch (error) {
        console.error('Error', error)
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
      tap.ok(call.id, 'Call resolved')

      // Wait until the callee answers the call and start collecting digits
      await waitForCollectStart

      const sendDigitResult = await call.sendDigits('1w2w3w#')
      tap.equal(
        call.id,
        sendDigitResult.id,
        'sendDigit returns the same instance'
      )

      // Resolve the collect end promise to inform the callee
      waitForCollectEndResolve()

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
      console.error('Outbound - voiceDetect error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
