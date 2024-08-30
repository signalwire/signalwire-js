import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectCallJoined,
  expectMCUVisible,
  getRemoteMediaIP,
} from '../../utils'

test.describe('CallFabric Reattach with Dial', () => {
  test('should reattach implicitly', async ({ createCustomPage, resource }) => {
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

  test.only('should reattach implicitly multiple times', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room-reattach_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession1 = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })

    expect(roomSession1.room_session).toBeDefined()
    const remoteIP = await getRemoteMediaIP(page)

    await expectMCUVisible(page)

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address and join a video room again
    const roomSession2 = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })
    console.timeEnd('reattach-time')

    expect(roomSession2.room_session).toBeDefined()
    const remoteIPReattached1 = await getRemoteMediaIP(page)

    await expectMCUVisible(page)

    expect(roomSession1.call_id).toBe(roomSession2.call_id)
    expect(roomSession1.member_id).toBe(roomSession2.member_id)
    expect(remoteIP).toBe(remoteIPReattached1)

    // --------------- Reattaching ---------------
    await page.reload()

    await createCFClient(page)

    console.time('reattach-time')
    // Dial the same address and join a video room again
    const roomSession3 = await expectCallJoined(page, {
      to: `/public/${roomName}`,
    })
    console.timeEnd('reattach-time')

    expect(roomSession3.room_session).toBeDefined()
    const remoteIPReattached2 = await getRemoteMediaIP(page)

    await expectMCUVisible(page)

    expect(roomSession1.call_id).toBe(roomSession2.call_id)
    expect(roomSession1.member_id).toBe(roomSession2.member_id)
    expect(remoteIP).toBe(remoteIPReattached2)
  })
})
