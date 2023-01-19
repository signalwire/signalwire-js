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
    { join_as: 'audience', expectMCU: expectMCUVisibleForAudience },
  ]

  tests.forEach((row) => {
    test(`should try reattaching to a room with a wrong call Id for ${row.join_as}`, async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({ name: `[reattach-callid-${row.join_as}]` })
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
      await page.reload()

      await createTestRoomSession(page, connectionSettings)

      console.time('reattach')
      // Try to join but expect to join with a different callId
      const reattachParams: any = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-expect-error
          const roomObj = window._roomObj
          roomObj.on('room.joined', resolve)

          const mockId = uuid()
          window.sessionStorage.setItem('callId', mockId)
          console.log('Injected callId with value', mockId)

          return roomObj.join()
        })
      })
      console.timeEnd('reattach')

      expect(reattachParams.room).toBeDefined()
      expect(reattachParams.room_session).toBeDefined()
      if (row.join_as === 'member') {
        expect(
          reattachParams.room.members.some(
            (member: any) => member.id === reattachParams.member_id
          )
        ).toBeTruthy()
      }
      expect(reattachParams.room_session.name).toBe(roomName)
      expect(reattachParams.room.name).toBe(roomName)
      // Make sure the member_id is stable
      expect(reattachParams.member_id).toBeDefined()
      expect(reattachParams.member_id).toBe(joinParams.member_id)
      // Also call_id must remain the same
      expect(reattachParams.call_id).toBeDefined()
      expect(reattachParams.call_id).toBe(joinParams.call_id)

      // Checks that the video is visible
      await row.expectMCU(page)
    })
  })
})
