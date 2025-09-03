import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectPageReceiveMedia,
  expectMediaEvent,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
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
      }
      await createTestRoomSession(page, connectionSettings)

      const firstMediaConnectedPromise = expectMediaEvent(page, {
        event: 'media.connected',
        timeout: 15_000,
        intervals: [15_000],
        message: 'first media.connected event was not received',
      })

      // --------------- Joining the room ---------------
      const joinedPromise = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined (${row.join_as})`,
      })
      await joinRoom(page, { message: `Joining room as ${row.join_as}` })
      const joinParams: any = await joinedPromise

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

      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj = window._roomObj as Video.RoomSession
          return roomObj.permissions
        },
        assertionFn: (roomPermissions) => {
          expect(roomPermissions).toStrictEqual(permissions)
        },
        message: 'room permissions are not equal',
      })

      await firstMediaConnectedPromise

      await expectPageReceiveMedia(page)

      const secondMediaConnectedPromise = expectMediaEvent(page, {
        event: 'media.connected',
        timeout: 50_000, // Longer timeout since we expect the event to be received once the network is up
        intervals: [50_000], // To avoid polling
        message: 'second media.connected event was not received',
      })

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
      const makeMemberUpdatedPromise = () => {
        return expectPageEvalToPass(page, {
          evaluateFn: () => {
            return new Promise((resolve) => {
              const roomObj = window._roomObj as Video.RoomSession
              roomObj.on('member.updated', resolve)
            })
          },
          assertionFn: (result) => {
            expect(result).toBeDefined()
          },
          message: 'member.updated event was not received',
        })
      }

      const promise1 = makeMemberUpdatedPromise()

      // --------------- Muting Member ---------------
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj = window._roomObj as Video.RoomSession
          return roomObj.audioMute()
        },
        assertionFn: (result) => {
          expect(result).toBeUndefined()
        },
        message: 'audio mute failed',
      })

      const memberMuted: any = await promise1
      expect(memberMuted.member.audio_muted).toBe(true)

      const promise2 = makeMemberUpdatedPromise()

      // --------------- Unmuting Member ---------------
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj = window._roomObj as Video.RoomSession
          return roomObj.audioUnmute()
        },
        assertionFn: (result) => {
          expect(result).toBeUndefined()
        },
        message: 'audio unmute failed',
      })

      const memberUnmuted: any = await promise2
      expect(memberUnmuted.member.audio_muted).toBe(false)
    })
  })
})
