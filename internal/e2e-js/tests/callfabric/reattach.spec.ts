import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectCallJoined,
  expectMCUVisible,
  getRemoteMediaIP,
} from '../../utils'

test.describe('CallFabric Reattach', () => {
  test('WebRTC to Room', async ({ createCustomPage, resource }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    let roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
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

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page)

    // Reattach to an address to join the same call session
    roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.reattach({
            to: `/public/${roomName}`,
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

  test('should reattach on call dial implicitly', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room-reattach_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })

    expect(roomSession.room_session).toBeDefined()
    const remoteIP = await getRemoteMediaIP(page)

    await expectMCUVisible(page)

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address and join a video room
    const roomSessionReattached = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })
    console.timeEnd('reattach-time')

    expect(roomSessionReattached.room_session).toBeDefined()
    const remoteIPReattached = await getRemoteMediaIP(page)

    await expectMCUVisible(page)

    expect(roomSession.call_id).toBe(roomSessionReattached.call_id)
    expect(roomSession.member_id).toBe(roomSessionReattached.member_id)

    // Ask @Giacomo; do we need to compare the remote IP?
    expect(remoteIP).toBe(remoteIPReattached)
  })

  test('should fail reattach with bad auth', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room-reattach-bad-auth_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })
    expect(roomSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address with a bogus authorization_state
    const roomSessionReattached = await page.evaluate(
      async ({ roomName }) => {
        // Inject wrong values for authorization state
        const key = 'as-SAT'
        const state = btoa('just wrong')
        window.sessionStorage.setItem(key, state)
        console.log(
          `Injected authorization state for ${key} with value ${state}`
        )

        // @ts-expect-error
        const client = window._client
        const call = await client.dial({
          to: `/public/${roomName}`,
          rootElement: document.getElementById('rootElement'),
        })
        // @ts-expect-error
        window._roomObj = call

        // Now try to reattach, which should not succeed
        return call.start().catch((error: any) => error)
      },
      { roomName }
    )
    console.timeEnd('reattach-time')

    const { code, message } = roomSessionReattached

    expect([-32002, '27']).toContain(code)
    expect([
      'CALL ERROR',
      'DESTINATION_OUT_OF_ORDER',
      'Cannot reattach this call with this member ID',
    ]).toContain(message)
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