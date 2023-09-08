import tap from 'tap'
import { SignalWire, Voice } from '@signalwire/realtime-api'
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

      let outboundCall: Voice.Call
      let callsReceived = new Set()

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context],
        onCallReceived: async (call) => {
          try {
            callsReceived.add(call.id)
            console.log(
              `Got call number: ${callsReceived.size}`,
              call.id,
              call.from,
              call.to,
              call.direction
            )

            tap.equal(call.state, 'created', 'Inbound call state is "created"')
            const resultAnswer = await call.answer()
            tap.equal(
              call.state,
              'answered',
              'Inbound call state is "answered"'
            )
            tap.ok(resultAnswer.id, 'Inboud call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Call answered gets the same instance'
            )

            if (callsReceived.size === 2) {
              const sendDigitResult = await call.sendDigits('1#')
              tap.equal(
                call.id,
                sendDigitResult.id,
                'Peer - SendDigit returns the same instance'
              )

              return
            }

            const recording = await call.recordAudio({
              direction: 'speak',
              inputSensitivity: 60,
            })
            tap.ok(recording.id, 'Recording started')
            tap.equal(
              recording.state,
              'recording',
              'Recording state is "recording"'
            )

            const playlist = new Voice.Playlist({ volume: 2 }).add(
              Voice.Playlist.TTS({
                text: 'Message is getting recorded',
              })
            )
            const playback = await call.play({ playlist })
            tap.equal(playback.state, 'playing', 'Playback state is "playing"')

            const playbackEndedResult = await playback.ended()
            tap.equal(
              playback.id,
              playbackEndedResult.id,
              'Playback instances are the same'
            )
            tap.equal(
              playbackEndedResult.state,
              'finished',
              'Playback state is "finished"'
            )
            tap.pass('Playback ended')

            console.log('Stopping the recording')
            recording.stop()
            const recordingEndedResult = await recording.ended()
            tap.equal(
              recordingEndedResult.state,
              'finished',
              'Recording state is "finished"'
            )

            const prompt = await call.prompt({
              playlist: new Voice.Playlist({ volume: 1.0 }).add(
                Voice.Playlist.TTS({
                  text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
                })
              ),
              digits: {
                max: 4,
                digitTimeout: 100,
                terminators: '#',
              },
              listen: {
                onStarted: async (p) => {
                  tap.ok(p.id, 'Prompt has started')

                  // Send digits from the outbound call
                  const sendDigitResult = await outboundCall.sendDigits(
                    '1w2w3w#'
                  )
                  tap.equal(
                    outboundCall.id,
                    sendDigitResult.id,
                    'OutboundCall - SendDigit returns the same instance'
                  )
                },
                onEnded: (p) => {
                  tap.ok(p.id, 'Prompt has ended')
                },
              },
            })

            const promptEndedResult = await prompt.ended()
            tap.equal(
              prompt.id,
              promptEndedResult.id,
              'Prompt instances are the same'
            )
            tap.equal(
              promptEndedResult.digits,
              '123',
              'Prompt - correct digits were entered'
            )

            console.log(
              `Connecting ${process.env.VOICE_DIAL_FROM_NUMBER} to ${process.env.VOICE_CONNECT_TO_NUMBER}`
            )
            const ringback = new Voice.Playlist().add(
              Voice.Playlist.Ringtone({
                name: 'it',
              })
            )
            const peer = await call.connectSip({
              from: makeSipDomainAppAddress({
                name: 'connect-from',
                domain: domainApp.domain,
              }),
              to: makeSipDomainAppAddress({
                name: 'connect-to',
                domain: domainApp.domain,
              }),
              timeout: 30,
              ringback, // optional
              maxPricePerMinute: 10,
            })
            tap.equal(peer.connected, true, 'Peer connected is true')
            tap.equal(call.connected, true, 'Call connected is true')
            tap.equal(
              call.connectState,
              'connected',
              'Call connected is state "connected"'
            )

            console.log('Peer:', peer.id, peer.type, peer.from, peer.to)
            console.log('Main:', call.id, call.type, call.from, call.to)

            const detector = await call.detectDigit({
              digits: '1',
            })

            const resultDetector = await detector.ended()
            // TODO: update this once the backend can send us the actual result
            tap.equal(
              // @ts-expect-error
              resultDetector.detect.params.event,
              'finished',
              'Peer - Detect digit is finished'
            )

            console.log('Finishing the calls.')
            call.disconnected().then(async () => {
              console.log('Call has been disconnected')
              await call.hangup()
              tap.equal(call.state, 'ended', 'Inbound call state is "ended"')
            })

            // Peer hangs up a call
            await peer.hangup()
          } catch (error) {
            console.error('Error', error)
            reject(4)
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
        maxPricePerMinute: 10,
      })
      outboundCall = call
      tap.ok(call.id, 'Call resolved')
      tap.equal(call.state, 'answered', 'Outbound call state is "answered"')

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
      tap.equal(call.state, 'ended', 'Outbound call state is "ended"')
      resolve(0)
    } catch (error) {
      console.error('Voice error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
