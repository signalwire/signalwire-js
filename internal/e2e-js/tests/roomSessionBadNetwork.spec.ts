import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectPageReceiveMedia,
  expectMediaEvent,
} from '../utils'

type Test = {
  join_as: 'member' | 'audience'
  expectMCU: typeof expectMCUVisible | typeof expectMCUVisibleForAudience
}

test.describe('roomSessionBadNetwork', () => {
  /**
   * Test both member and audience
   */
  const tests: Test[] = [
    { join_as: 'member', expectMCU: expectMCUVisible },
    // { join_as: 'audience', expectMCU: expectMCUVisibleForAudience },
  ]

  tests.forEach((row) => {
    test(`should survive to a network switch for ${row.join_as}`, async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({
        name: `[bad-network-${row.join_as}]`,
      })
      await page.goto(SERVER_URL)

      const roomName = randomizeRoomName()
      const permissions = ['room.self.audio_mute', 'room.self.audio_unmute']
      const connectionSettings = {
        vrt: {
          room_name: roomName,
          user_name: `e2e_bad_network_${row.join_as}`,
          join_as: row.join_as,
          auto_create_room: true,
          permissions,
        },
        initialEvents: ['member.updated'],
        roomSessionOptions: {
          reattach: true, // FIXME: to remove
        },
      }
      await createTestRoomSession(page, connectionSettings)

      const firstMediaConnectedPromise = expectMediaEvent(
        page,
        'media.connected'
      )

      // --------------- Joining the room ---------------
      const joinParams: any = await expectRoomJoined(page)

      expect(joinParams.room).toBeDefined()
      expect(joinParams.room_session).toBeDefined()
      if (row.join_as === 'member') {
        expect(
          joinParams.room.members.some(
            (member: any) => member.id === joinParams.member_id
          )
        ).toBeTruthy()
      }
      expect(joinParams.room_session.name).toBe(roomName)
      expect(joinParams.room.name).toBe(roomName)

      // Checks that the video is visible
      await row.expectMCU(page)

      const roomPermissions: any = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.permissions
      })
      expect(roomPermissions).toStrictEqual(permissions)

      await firstMediaConnectedPromise

      await expectPageReceiveMedia(page)

      const secondMediaConnectedPromise = expectMediaEvent(
        page,
        'media.connected'
      )
      // --------------- Simulate Network Down and Up in 15s ---------------
      await page.swNetworkDown()
      await page.waitForTimeout(15_000)
      await page.swNetworkUp()

      await page.waitForTimeout(5_000)

      await secondMediaConnectedPromise

      await expectPageReceiveMedia(page)

      await page.waitForTimeout(10_000)

      await expectPageReceiveMedia(page)

      // Make sure we still receive events from the room
      const makeMemberUpdatedPromise = () =>
        page.evaluate(async () => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('member.updated', resolve)
          })
        })

      const promise1 = makeMemberUpdatedPromise()

      // --------------- Muting Member ---------------
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.audioMute()
      })

      const memberMuted: any = await promise1
      console.log('WWW', memberMuted)
      expect(memberMuted.member.audio_muted).toBe(true)

      const promise2 = makeMemberUpdatedPromise()

      // --------------- Muting Member ---------------
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.audioUnmute()
      })

      const memberUnmuted: any = await promise2
      console.log('WWW', memberUnmuted)
      expect(memberUnmuted.member.audio_muted).toBe(false)
    })
  })
})
