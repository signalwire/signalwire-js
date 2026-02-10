import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PROPS,
  CALL_RECORD_PROPS,
  TestHandler,
  makeSipDomainAppAddress,
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

      const unsubVoiceOffice = await client.voice.listen({
        topics: [domainApp.call_relay_context],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

      const unsubVoiceHome = await client.voice.listen({
        topics: ['home'],
        // This should never run since VOICE_DIAL_TO_NUMBER is listening only for "office" topic
        onCallReceived: async (call) => {
          tap.notOk(call, 'Inbound - Home topic received a call')
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
          onStateChanged: async (call) => {
            if (call.state === 'ended') {
              await unsubVoiceOffice()

              await unsubVoiceHome()

              await unsubRecord?.()

              await client.disconnect()

              resolve(0)
            }
          },
          onRecordingStarted: (recording) => {
            tap.hasProps(
              recording,
              CALL_RECORD_PROPS,
              'voice.dialPhone: Recording started'
            )
            tap.equal(
              recording.state,
              'recording',
              'voice.dialPhone: Recording correct state'
            )
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const unsubCall = await call.listen({
        onRecordingStarted: (recording) => {
          tap.hasProps(
            recording,
            CALL_RECORD_PROPS,
            'call.listen: Recording started'
          )
          tap.equal(
            recording.state,
            'recording',
            'call.listen: Recording correct state'
          )
        },
        onRecordingEnded: (recording) => {
          // NotOk since we unsubscribe this listener before the recording stops
          tap.notOk(recording.id, 'call.listen: Recording ended')
        },
      })

      const record = call.recordAudio({
        listen: {
          onStarted: async (recording) => {
            tap.hasProps(
              recording,
              CALL_RECORD_PROPS,
              'call.recordAudio: Recording started'
            )
            tap.equal(
              recording.state,
              'recording',
              'call.recordAudio: Recording correct state'
            )

            await unsubCall()

            await record.stop()
          },
        },
      })

      const unsubRecord = await record.listen({
        onStarted: (recording) => {
          // NotOk since the listener is attached after the call.record has resolved
          tap.notOk(recording.id, 'record.listen: Recording stared')
        },
        onEnded: async (recording) => {
          tap.hasProps(
            recording,
            CALL_RECORD_PROPS,
            'record.listen: Recording ended'
          )

          const recordId = await record.id
          tap.equal(
            recording.id,
            recordId,
            'record.listen: Recording correct id'
          )
          tap.equal(
            recording.state,
            'finished',
            'record.listen: Recording correct state'
          )

          await call.hangup()
        },
      })
    } catch (error) {
      console.error('VoiceRecordingAllListeners error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Record with all Listeners E2E',
    testHandler: handler,
    executionTime: 30_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
