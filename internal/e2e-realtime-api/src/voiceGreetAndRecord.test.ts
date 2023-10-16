/**
 * Users should be able to call a SW number, get greeted by a voicemail, and record a message.
 */
import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
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
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          logWsTraffic: true,
        },
      })

      let waitForPlaybackEndResolve: () => void
      const waitForPlaybackEnd = new Promise<void>((resolve) => {
        waitForPlaybackEndResolve = resolve
      })

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context, 'home'],
        onCallReceived: async (call) => {
          try {
            await call.answer()

            await call.playTTS({
              text: 'Hey there! You have reached SignalWire. Please leave your message and we will get back to you.',
            })

            const record = await call.recordAudio().onStarted()

            tap.ok(record.url, 'Recording URL')
            console.log(record.url)

            waitForPlaybackEndResolve()
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

      await waitForPlaybackEnd

      await call.playTTS({
        text: 'Hello! This is a recorded message. Please call me back when you get this. Thank you!',
      })

      await call.hangup()

      await unsubVoice()

      resolve(0)
    } catch (error) {
      console.error('VoiceGreetAndRecord error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice VoiceGreetAndRecord E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
