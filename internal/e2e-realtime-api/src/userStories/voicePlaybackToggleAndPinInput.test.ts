/**
 * During a 1-leg call, the user should be able (at any moment) to press # to toggle
 * a playback between play and paused state. This will use our collector/detector API.
 * Pressing * will permanently stop the playback and the collector/detector.
 * Asynchronously, after 10 seconds from the start of the call,
 * the system prompts for a four-digit pin that can be provided either by voice or by dtmf.
 */
import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
  sleep,
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

      let waitForCallectStartResolve: () => void
      const waitForCallectStart = new Promise<void>((resolve) => {
        waitForCallectStartResolve = resolve
      })

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context, 'home'],
        onCallReceived: async (call) => {
          try {
            // Answer the incoming call
            await call.answer()

            // Wait until the caller starts the collect
            await waitForCallectStart

            // Send digits after 3 seconds (Expect playback pause)
            await sleep(3000)
            await call.sendDigits('#')

            // Send digits after 5 seconds (Expect playback resume)
            await sleep(5000)
            await call.sendDigits('#')

            // // Send digits after 5 seconds (Expect playback stop)
            // await sleep(5000)
            // await call.sendDigits('*')
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

      // Start playing music
      const playback = await call
        .playAudio({
          url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
          listen: {
            onUpdated: (_playback) => {
              tap.ok('Playback updated', _playback)
              console.log('Playback updated', playback.state)
            },
          },
        })
        .onStarted()

      await call.collect({
        initialTimeout: 4.0,
        digits: {
          max: 4,
          terminators: '*',
        },
        partialResults: true,
        continuous: true,
        listen: {
          onStarted: () => {
            // Inform callee about the collect start
            waitForCallectStartResolve()
          },
          onUpdated: async (_collect) => {
            const { result } = _collect
            if (result.type === 'digit' && result.params.digits === '#') {
              // Toggle playback
              if (playback.state === 'playing') {
                console.log('Pausing playback')
                await playback.pause()
              }
              if (playback.state === 'paused') {
                console.log('Resuming playback')
                await playback.resume()
              }
            }

            if (result.type === 'digit' && result.params.digits === '*') {
              console.log('Stopping playback')
              await playback.stop()
            }
          },
        },
      })

      // // Hangup the call
      // await call.hangup()

      // // Unsubscribe voice listeners
      // await unsubVoice()

      // // Disconnect the client
      // await client.disconnect()

      // resolve(0)
    } catch (error) {
      console.error('VoicePlaybackToggleAndPinInput error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice VoicePlaybackToggleAndPinInput E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
