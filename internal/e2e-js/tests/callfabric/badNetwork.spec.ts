import { uuid } from '@signalwire/core'
import { FabricRoomSession } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectPageReceiveMedia,
} from '../../utils'

test.describe('CallFabric BadNetwork', () => {
  test('should survive a network switch for member', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({
      name: '[bad-network-cf-member]',
    })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // --------------- Joining the room ---------------
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(roomSession.room_session.name).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    // Checks that the video is visible
    await expectMCUVisible(page)

    await expectPageReceiveMedia(page)

    // Set up media event tracking before the network outage.
    // The media connection may or may not survive depending on
    // the TURN relay behavior:
    //  - If media survives: no media events fire, packets keep flowing
    //  - If media disconnects: media.disconnected fires, then
    //    media.connected fires after recovery (ICE restart)
    await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj
      // @ts-expect-error
      window._mediaDisconnected = false
      // @ts-expect-error
      window._mediaReconnected = false

      roomObj.on('media.disconnected', () => {
        // @ts-expect-error
        window._mediaDisconnected = true
      })
      roomObj.on('media.connected', () => {
        // @ts-expect-error
        if (window._mediaDisconnected) {
          // @ts-expect-error
          window._mediaReconnected = true
        }
      })
    })

    // --------------- Simulate Network Down and Up in 15s ---------------
    await page.swNetworkDown()
    await page.waitForTimeout(15_000)
    await page.swNetworkUp()

    // Wait for either:
    // 1. media.connected (if media disconnected and recovered), or
    // 2. a reasonable time for the WS to reconnect (if media survived)
    await page.waitForFunction(
      () => {
        // @ts-expect-error
        const disconnected = window._mediaDisconnected
        // @ts-expect-error
        const reconnected = window._mediaReconnected

        // Media never disconnected - connection survived
        if (!disconnected) return true
        // Media disconnected and has reconnected
        if (reconnected) return true

        return false
      },
      undefined,
      { timeout: 30_000, polling: 1_000 }
    )

    // Allow time for media to stabilize after reconnection
    await page.waitForTimeout(5_000)

    // Verify media is actively flowing
    await expectPageReceiveMedia(page)

    await page.waitForTimeout(10_000)

    await expectPageReceiveMedia(page)

    // Make sure we still receive signaling events from the room
    const makeMemberUpdatedPromise = () =>
      page.evaluate(async () => {
        return new Promise((resolve) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj
          roomObj.on('member.updated', resolve)
        })
      })

    const promise1 = makeMemberUpdatedPromise()

    // --------------- Muting Member ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj
      await roomObj.audioMute()
    })

    const memberMuted: any = await promise1
    expect(memberMuted.member.audio_muted).toBe(true)

    const promise2 = makeMemberUpdatedPromise()

    // --------------- Unmuting Member ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj
      await roomObj.audioUnmute()
    })

    const memberUnmuted: any = await promise2
    expect(memberUnmuted.member.audio_muted).toBe(false)
  })
})
