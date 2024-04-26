import { test } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  executeWithExpectedWsTraffic,
  expectMCUVisible,
} from '../../utils'

test.describe('CallFabric Reconnections', () => {
  test('should reconnect the WS without media renegotiation', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    await page.goto(SERVER_URL)

    const roomName = 'cf-e2e-test-room'

    await createCFClient(page)

    // @ts-expect-error
    await page.evaluate(() => (window.__wsTraffic = []))

    console.log(
      '############################################## dial #######################################################'
    )
    // Dial an address and join a video room
    await executeWithExpectedWsTraffic(
      page,
      async () =>
        page.evaluate(
          async ({ roomName }) => {
            return new Promise<any>(async (resolve, _reject) => {
              // @ts-expect-error
              const client = window._client

              const call = await client.dial({
                to: `/public/${roomName}`,
                rootElement: document.getElementById('rootElement'),
              })

              call.on('room.joined', resolve)
              call.on('room.updated', () => {})

              // @ts-expect-error
              window._roomObj = call

              await call.start()
            })
          },
          { roomName }
        ),
      // expected traffic on the websocket
      [
        {
          type: 'send',
          name: 'connect',
          expect: {
            method: 'signalwire.connect',
            'params.version.major': 4,
          },
        },
        {
          type: 'recv',
          name: 'connect-response',
          expect: {
            'result.authorization.jti': /.+/,
            'result.authorization.project_id':
              'cb1e91b6-ae04-4be0-89ae-0dffc5ea6aed',
            'result.authorization.fabric_subscriber.subscriber_id':
              '48fe0d0c-ac31-4222-93c9-39590ce92d78',
          },
        },
        {
          type: 'recv',
          name: 'authorization-state',
          expect: {
            method: 'signalwire.event',
            'params.event_type': 'signalwire.authorization.state',
            'params.params.authorization_state': /.+/,
          },
        },
        {
          type: 'send',
          name: 'invite',
          expect: {
            method: 'webrtc.verto',
            'params.message.method': 'verto.invite',
            'params.message.params.dialogParams.callID': /.+/,
            'params.message.params.dialogParams.destination_number': /^\/.+/,
            'params.message.params.sdp':
              /^(?=.*a=setup:actpass.*)(?=.*^m=audio.*)(?=.*^m=video.*)/ms,
            'params.message.callID': /.+/,
          },
        },
        {
          type: 'recv',
          name: 'conversation-call_started',
          expect: {
            method: 'signalwire.event',
            'params.event_type': 'conversation.message',
            'params.params.type': 'message',
            'params.params.kind': 'call_started',
          },
        },
        {
          type: 'recv',
          name: 'call-created',
          expect: {
            'result.code': '200',
            'result.result.result.message': 'CALL CREATED',
          },
        },
        {
          type: 'recv',
          name: 'verto-answer',
          expect: {
            method: 'signalwire.event',
            'params.event_type': 'webrtc.message',
            'params.params.method': 'verto.answer',
            'params.params.params.sdp':
              /^(?=.*a=setup:(?:active|passive))(?=.*^m=audio.*)(?=.*^m=video.*)/ms,
          },
        },
        {
          type: 'recv',
          name: 'mediaParams',
          expect: {
            method: 'signalwire.event',
            'params.event_type': 'webrtc.message',
            'params.params.method': 'verto.mediaParams',
          },
        },
        {
          type: 'recv',
          name: 'mediaParams',
          expect: {
            method: 'signalwire.event',
            'params.event_type': 'call.joined',
          },
        },
      ]
    )

    console.log(
      '############################################## expectMCUVisible #######################################################'
    )
    await expectMCUVisible(page)

    //@ts-ignore
    await page.evaluate(() => (window.__wsTraffic = []))
    console.log(
      '############################################## Hangup #######################################################'
    )
    // Hangup
    await executeWithExpectedWsTraffic(
      page, async () => page.evaluate(async () => {
      //@ts-ignore
      await window._roomObj.leave()
      //@ts-ignore
      window._roomObj = null
    }),
    [
      {
        type: 'recv',
        name: 'bye',
        expect: {
          'method': 'webrtc.verto',
          'params.message.method': 'verto.bye',
        },
      },
      {
        type: 'recv',
        name: 'bye result',
        expect: {
          'result.code': '200',
          'result.result.result.message': 'CALL ENDED',
        },
      },
    ]
  )
  console.log(
    '############################################## Done #######################################################'
  )
  console.log(
    '############################################## Done #######################################################'
  )
  console.log(
    '############################################## Done #######################################################'
  )
  })

  
})
