import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'
import { FabricRoomSession, SignalWireClient } from '@signalwire/js'

test.describe('Reattach Tests', () => {
  test('WebRTC to Room', async ({ createCustomPage, resource }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    let roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()
    const currentCallId = roomSession.call_id

    await expectMCUVisible(page)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page)

    // Reattach to an address to join the same call session
    roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          const call = await client.reattach({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call
          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.call_id).toEqual(currentCallId)
    // TODO the server is not sending a layout state on reattach
    // await expectMCUVisible(page)
  })

  test('WebRTC to Room - should handle mute states', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    let roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          const client = window._client!

          const call = await client.dial({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.room_session).toBeDefined()
    const currentCallId = roomSession.call_id

    await expectMCUVisible(page)

    // --------------- Muting Video (self) ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj

      const memberUpdatedMuted = new Promise((resolve) => {
        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', () => res(true))
        })
        const memberUpdatedMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.videoMuted', () => res(true))
        })

        Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(resolve)
      })

      await roomObj.videoMute()

      await memberUpdatedMuted
    })

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj

      const memberUpdatedMuted = new Promise((resolve) => {
        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', () => res(true))
        })
        const memberUpdatedMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.audioMuted', () => res(true))
        })

        Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(resolve)
      })

      await roomObj.audioMute()

      await memberUpdatedMuted
    })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page)

    // Reattach to an address to join the same call session
    const callJoinedEvent = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          const client = window._client!

          const call = await client.reattach({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call
          await call.start()
        })
      },
      { roomName }
    )

    expect(callJoinedEvent.call_id).toEqual(currentCallId)

    const localVideoTrack = await page.evaluate(
      // @ts-expect-error
      () => window._roomObj.peer.localVideoTrack
    )
    expect(localVideoTrack).toEqual({})

    const localAudioTrack = await page.evaluate(
      // @ts-expect-error
      () => window._roomObj.peer.localAudioTrack
    )
    expect(localAudioTrack).toEqual({})
  })

  // TODO uncomment after fixed in the backend
  // test('WebRTC to SWML to Room', async ({
  //   createCustomPage,
  //   resource,
  // }) => {

  //   const page = await createCustomPage({ name: '[page]' })
  //   await page.goto(SERVER_URL)

  //   const roomName = `e2e-video-room_${uuid()}`
  //   await resource.createVideoRoomResource(roomName)
  //   const resourceName = `e2e-swml-app_${uuid()}`
  //   await resource.createSWMLAppResource({
  //     name: resourceName,
  //     contents: {
  //       sections: {
  //         main: [
  //           'answer',
  //           {
  //             play: {
  //               volume: 10,
  //               urls: [
  //                 'silence:1.0',
  //                 'say:Hello, connecting to a fabric resource that is a room',
  //               ],
  //             },
  //             connect: {
  //               to: `/public/${roomName}`,
  //               answer_on_bridge: true
  //             }
  //           },
  //         ],
  //       },
  //     },
  //   })

  //   await createCFClient(page)

  //   // Dial an address and join a video room
  //   let roomSession = await page.evaluate(
  //     async ({ resourceName }) => {
  //       return new Promise<any>(async (resolve, _reject) => {
  //         // @ts-expect-error
  //         const client = window._client
  //         let callJoinedCount = 0

  //         const call = await client.dial({
  //           to: `/private/${resourceName}`,
  //           rootElement: document.getElementById('rootElement'),
  //         })

  //         call.on('call.joined', (event: any) => {
  //           callJoinedCount++
  //           if(callJoinedCount >= 2) {
  //             resolve(event)
  //           }
  //         })

  //         // @ts-expect-error
  //         window._roomObj = call

  //         await call.start()
  //       })
  //     },
  //     { resourceName }
  //   )

  //   expect(roomSession.room_session).toBeDefined()
  //   const currentCallId = roomSession.call_id

  //   await expectMCUVisible(page)

  //   await page.reload({ waitUntil: 'domcontentloaded'})
  //   await createCFClient(page)

  //   // FIXME Server is not accepting the invite
  //   // Reattach to an address to join the same call session
  //   roomSession = await page.evaluate(
  //     async ({ resourceName }) => {
  //       return new Promise<any>(async (resolve, _reject) => {
  //         // @ts-expect-error
  //         const client = window._client

  //         const call = await client.reattach({
  //           to: `/private/${resourceName}`,
  //           rootElement: document.getElementById('rootElement'),
  //         })

  //         call.on('call.joined', resolve)

  //         // @ts-expect-error
  //         window._roomObj = call
  //         await call.start()
  //       })
  //     },
  //     { resourceName }
  //   )

  //   expect(roomSession.call_id).toEqual(currentCallId)
  //   // TODO the server is not sending a layout state on reattach
  //   // await expectMCUVisible(page)
  // })
})
