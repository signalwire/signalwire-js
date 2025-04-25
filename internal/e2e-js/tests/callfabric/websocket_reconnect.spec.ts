import { test } from '../../fixtures'


test.describe('CallFabric Reconnections', () => {
  // FIXME: page.swNetworkDown() isn't enough to simulate real test scenario

  // test('Should reconnect the WebSocket as soon it gets onClose event, without media renegotiation', async ({
  //   createCustomPage,
  // }) => {
  //   const page = await createCustomPage({ name: '[page]' })

  //   await page.goto(SERVER_URL)

  //   const roomName = 'cf-e2e-test-room'

  //   await createCFClient(page)

  //   page.resetWsTraffic()
  //   // Dial an address and join a video room
  //   await dialAddress(page, {
  //     address: `/public/${roomName}?channel=video`,
  //   })

  //   await page.expectWsTraffic({
  //     assertations: [
  //       {
  //         type: 'send',
  //         name: 'invite',
  //         expect: {
  //           method: 'webrtc.verto',
  //           'params.message.method': 'verto.invite',
  //           'params.message.params.dialogParams.destination_number':
  //             '/public/cf-e2e-test-room',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'call-created',
  //         expect: {
  //           'result.code': '200',
  //           'result.result.result.message': 'CALL CREATED',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'verto-answer',
  //         expect: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'webrtc.message',
  //           'params.params.method': 'verto.answer',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'callJoined',
  //         expect: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'call.joined',
  //         },
  //       },
  //     ],
  //   })

  //   // simulate ws
  //   page.resetWsTraffic()
  //   await page.evaluate(async () => {
  //     //@ts-ignore
  //     window._roomObj._closeWSConnection()
  //     return new Promise((ressolve) => setTimeout(ressolve, 15000))
  //   })

  //   await page.expectWsTraffic({
  //     assertations: [
  //       {
  //         type: 'send',
  //         name: 'reconnect',
  //         expect: {
  //           method: 'signalwire.connect',
  //           'params.version.major': 4,
  //           'params.authorization_state': /.+/,
  //         },
  //       },
  //       {
  //         type: 'send',
  //         name: 'invite',
  //         expectNot: {
  //           method: 'webrtc.verto',
  //           'params.message.method': 'verto.invite',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'callJoined',
  //         expectNot: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'call.joined',
  //         },
  //       },
  //     ],
  //   })
  // })

  // test('Should reconnect the WebSocket when network is up (before FS timeout), without media renegotiation', async ({
  //   createCustomPage,
  // }) => {
  //   const page = await createCustomPage({ name: '[page]' })

  //   await page.goto(SERVER_URL)

  //   const roomName = 'cf-e2e-test-room'

  //   await createCFClient(page)

  //   page.resetWsTraffic()
  //   // Dial an address and join a video room
  //   // TODO: make dialAddress work with expectWsTraffic
  //   // await dialAddress(page, {
  //   //   address: `/public/${roomName}?channel=video`,
  //   // })

  //   await page.evaluate(
  //     async ({ roomName }) => {
  //       return new Promise<any>(async (resolve, _reject) => {
  //         const client = window._client!

  //         const call = await client.dial({
  //           to: `/public/${roomName}`,
  //           rootElement: document.getElementById('rootElement'),
  //         })

  //         call.on('room.joined', resolve)
  //         call.on('room.updated', () => {})

  //         // @ts-expect-error
  //         window._roomObj = call

  //         await call.start()
  //       })
  //     },
  //     { roomName }
  //   )

  //   await page.expectWsTraffic({
  //     assertations: [
  //       {
  //         type: 'send',
  //         name: 'invite',
  //         expect: {
  //           method: 'webrtc.verto',
  //           'params.message.method': 'verto.invite',
  //           'params.message.params.dialogParams.destination_number':
  //             '/public/cf-e2e-test-room',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'call-created',
  //         expect: {
  //           'result.code': '200',
  //           'result.result.result.message': 'CALL CREATED',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'verto-answer',
  //         expect: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'webrtc.message',
  //           'params.params.method': 'verto.answer',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'callJoined',
  //         expect: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'call.joined',
  //         },
  //       },
  //     ],
  //   })

  //   page.resetWsTraffic()
  //   await page.swNetworkDown()
  //   await page.waitForTimeout(14500)
  //   await page.swNetworkUp()

  //   //wait network traffic
  //   await page.waitForTimeout(1000)

  //   await page.expectWsTraffic({
  //     assertations: [
  //       {
  //         type: 'send',
  //         name: 'reconnect',
  //         expect: {
  //           method: 'signalwire.connect',
  //           'params.version.major': 4,
  //           'params.authorization_state': /.+/,
  //         },
  //       },
  //       {
  //         type: 'send',
  //         name: 'invite',
  //         expectNot: {
  //           method: 'webrtc.verto',
  //           'params.message.method': 'verto.invite',
  //         },
  //       },
  //       {
  //         type: 'send',
  //         name: 'invite',
  //         expectNot: {
  //           method: 'webrtc.verto',
  //           'params.message.method': 'verto.modify',
  //         },
  //       },
  //       {
  //         type: 'recv',
  //         name: 'callJoined',
  //         expectNot: {
  //           method: 'signalwire.event',
  //           'params.event_type': 'call.joined',
  //         },
  //       },
  //     ],
  //   })
  // })
})
