import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

const handlers= (): TestHandler[] => {
  const cases = {
    'continuous: true and partialResults: true': {
      continuous: true,
      partialResult: true,
      hangupAfter: 15_000,
      expectedText: 'one two three four five six seven eight nine ten  11 to 8',
    },
    'continuous: true and partialResults: false': {
      continuous: true,
      partialResult: false,
      hangupAfter: 15_000,
      expectedText: 'one two three four five six seven eight nine ten  11 to 8',
    },
    'continuous: false and partialResults: true': {
      continuous: false,
      partialResult: true,
      hangupAfter: 15_000,
      expectedText: 'one two three four five six seven eight nine ten  11 to 8',
    },
    'continuous: false and partialResults: false': {
      continuous: false,
      partialResult: false,
      hangupAfter: 15_000,
      expectedText: 'one two three four five six seven eight nine ten  11 to 8',
    },
    'continuous: false and partialResults: true (hangup before palying the audio file finish)': {
      continuous: true,
      partialResult: true,
      hangupAfter: 9_000,
      expectedText: '123456789  10',
    },
  }

  const handlers: TestHandler[] = []
  for (let [testCase, options] of Object.entries(cases)) {
    handlers.push(({ domainApp }) => {
      return new Promise(async (resolve, reject) => { 
        if (!domainApp) {
          throw new Error('Missing domainApp')
        }
        console.log(`Running collect test with ${testCase}`)
        console.log(domainApp.call_relay_context)
        const client = new Voice.Client({
          host: process.env.RELAY_HOST,
          project: process.env.RELAY_PROJECT as string,
          token: process.env.RELAY_TOKEN as string,
          contexts: [domainApp.call_relay_context, "relaye2e"],
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
            tap.ok(resultAnswer.id, 'Inbound call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Call answered gets the same instance'
            )

            call.on('collect.started', (collect) => {
              console.log('>>> collect.started')
            })
            call.on('collect.updated', (collect) => {
              console.log('>>> collect.updated', collect.text)
            })
            call.on('collect.ended', (collect) => {
              console.log('>>> collect.ended', collect.text)
            })
            call.on('collect.failed', (collect) => {
              console.log('>>> collect.failed', collect.reason)
            })

            const callCollect = await call.collect({
              initialTimeout: 10.0,
              speech: {
                endSilenceTimeout: 6.0,
                speechTimeout: 60.0,
                language:'en-US',
                model: 'enhanced.phone_call',
              },
              partialResults: options.partialResult,
              continuous: options.continuous,
              sendStartOfInput: true
            })

            // Resolve the answer promise to inform the caller
            waitForCollectStartResolve()

            // Wait until the caller ends entring the digits
            await waitForCollectEnd
            // const collected = await callCollect.stop();
            const collected = await callCollect.ended() // block the script until the collect ended
            tap.equal(collected.text, options.expectedText, 'Received Correct Text')
            // await callCollect.stop()
            // await callCollect.startInputTimers()
            // await call.hangup()
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
            console.error('Error', error)
            reject(4)
          }
        })

        try {
          const call = await client.dialSip({
            // to: makeSipDomainAppAddress({
            //   name: 'to',
            //   domain: domainApp.domain,
            // }),
            // from: makeSipDomainAppAddress({
            //   name: 'from',
            //   domain: domainApp.domain,
            // }),
            to: 'sip:to@dev-min.dapp.swire.io',
            from: 'sip:from@dev-min.dapp.swire.io',
            timeout: 30,
          })
          tap.ok(call.id, 'Call resolved')

          // Wait until the callee answers the call and start collecting digits
          await waitForCollectStart

          // const sendDigitResult = await call.sendDigits('1w2w3w#')
          
          // tap.equal(
          //   call.id,
          //   sendDigitResult.id,
          //   'sendDigit returns the same instance'
          // )
      
          call.playAudio({
            url: 'https://od.lk/s/MzJfMjM1ODY4Nzlf/recording3.mp3',
          })
          await new Promise((resolve) => setTimeout(resolve, options.hangupAfter))
          // Resolve the collect end promise to inform the callee
          waitForCollectEndResolve()
          await call.hangup()
        } catch (error) {
          console.error('Outbound - voiceDetect error', error)
          reject(4)
        }
      })
    })
  }
  return handlers;
}

async function main() {
  for (let handler of handlers()) {
    const runner = createTestRunner({
      name: 'Voice Speech Collect E2E',
      testHandler: handler,
      executionTime: 60_000,
      useDomainApp: true,
    })

    await runner.run()
  }
}

main()
