import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  getRemoteMediaIP,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
} from '../utils'

type Test = {
  join_as: 'member' | 'audience'
  expectMCU: typeof expectMCUVisible | typeof expectMCUVisibleForAudience
}

test.describe('RoomSessionReattach', () => {
  /**
   * Test both member and audience
   */
  const tests: Test[] = [
    { join_as: 'member', expectMCU: expectMCUVisible },
    { join_as: 'audience', expectMCU: expectMCUVisibleForAudience },
  ]

  tests.forEach((row) => {
    test(`should allow reattaching to a room for ${row.join_as}`, async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({ name: `[reattach-${row.join_as}]` })
      await page.goto(SERVER_URL)

      const roomName = randomizeRoomName()
      const permissions: any = []
      const connectionSettings = {
        vrt: {
          room_name: roomName,
          user_name: `e2e_reattach_test_${row.join_as}`,
          join_as: row.join_as,
          auto_create_room: true,
          permissions,
        },
        initialEvents: [],
      }
      await createTestRoomSession(page, connectionSettings)

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
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          return roomObj.permissions
        },
        assertionFn: (roomPermissions) =>
          expect(roomPermissions).toStrictEqual(permissions),
        message: 'Expected room permissions to match',
      })

      const initialRemoteIP = await getRemoteMediaIP(page)

      // --------------- Reattaching ---------------
      await page.reload()

      await createTestRoomSession(page, connectionSettings)

      console.time('reattach')
      // Join again
      const rejoinedPromise = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined after reattach (${row.join_as})`,
      })
      await joinRoom(page, { message: `Rejoining room as ${row.join_as}` })
      const reattachParams = await rejoinedPromise
      console.timeEnd('reattach')

      expect(reattachParams.room).toBeDefined()
      expect(reattachParams.room_session).toBeDefined()
      if (row.join_as === 'member') {
        expect(
          reattachParams.room.members.some(
            (member) => member.id === reattachParams.member_id
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

      const reattachedRemoteIP = await getRemoteMediaIP(page)

      if (reattachedRemoteIP !== initialRemoteIP) {
        console.warn('\n\n\n\n --- IPS ARE DIFFERENT --- \n\n\n\n')
      }
      // TODO: restore expect
      // expect(reattachedRemoteIP).toBe(initialRemoteIP)
    })
  })
})
