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
    test(`should allow survive to a WS blip for ${row.join_as}`, async ({
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
        initialEvents: ['member.talking'],
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

      await expectPageReceiveMedia(page)

      await page.waitForTimeout(10_000)

      await expectPageReceiveMedia(page)

      await secondMediaConnectedPromise

      // Make sure we still receive events from the room
      const makeMemberTalkingPromise = () =>
        page.evaluate(async () => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('member.talking', resolve)
          })
        })

      const promise1 = makeMemberTalkingPromise()

      // --------------- Muting Member ---------------
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.audioMute()
      })

      await promise1

      const promise2 = makeMemberTalkingPromise()

      // --------------- Muting Member ---------------
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.audioUnmute()
      })

      await promise2
    })
  })
})
