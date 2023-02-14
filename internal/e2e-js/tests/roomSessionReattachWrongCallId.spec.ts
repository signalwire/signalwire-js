import { test, expect } from '../fixtures'
import { uuid } from '@signalwire/core'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
  expectMCUVisibleForAudience,
} from '../utils'

type Test = {
  join_as: 'member' | 'audience'
  expectMCU: typeof expectMCUVisible | typeof expectMCUVisibleForAudience
}

test.describe('RoomSessionReattachWrongCallId', () => {
  /**
   * Test both member and audience
   */
  const tests: Test[] = [
    { join_as: 'member', expectMCU: expectMCUVisible },
    // { join_as: 'audience', expectMCU: expectMCUVisibleForAudience },
  ]

  tests.forEach((row) => {
    test(`should try reattaching to a room with a wrong call Id for ${row.join_as}`, async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({
        name: `[reattach-callid-${row.join_as}]`,
      })
      await page.goto(SERVER_URL)

      const roomName = randomizeRoomName()
      const permissions: any = []
      const connectionSettings = {
        vrt: {
          room_name: roomName,
          user_name: `e2e_reattach_wrong_callid_${row.join_as}`,
          join_as: row.join_as,
          auto_create_room: true,
          permissions,
        },
        initialEvents: [],
        roomSessionOptions: {
          reattach: true, // FIXME: to remove
        },
      }
      await createTestRoomSession(page, connectionSettings)

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

      // --------------- Reattaching ---------------
      await page.waitForTimeout(2000)

      await page.reload()

      const reattachConnectionSettings = {
        vrt: {
          room_name: roomName,
          user_name: `e2e_reattach_wrong_callid_${row.join_as}`,
          join_as: row.join_as,
          auto_create_room: true,
          permissions,
        },
        initialEvents: [],
        roomSessionOptions: {
          reattach: true, // FIXME: to remove
        },
        expectToJoin: false,
      }
      await createTestRoomSession(page, reattachConnectionSettings)

      // ----- Join the room with a bogus call ID and expect an error --
      const joinError: any = await page.evaluate(async ({ mockId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        window.sessionStorage.setItem('callId', mockId)
        console.log('Injected callId with value', mockId)
        const error = await roomObj.join().catch((error) => error)

        return error
      },
      { mockId: uuid() }
      )

      expect(joinError.code).toBe('81')
      expect(joinError.message).toBe('INVALID_CALL_REFERENCE')
    })
  })
})
