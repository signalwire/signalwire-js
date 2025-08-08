import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  deleteRoom,
  expectRoomJoinWithDefaults,
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
      const page = await createCustomPage({
        name: `[reattach-multiple-${row.join_as}]`,
      })
      await page.goto(SERVER_URL)

      const roomName = `multiple-${randomizeRoomName()}`
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

      const joinParams: any = await expectRoomJoinWithDefaults(page, {
        joinAs: row.join_as,
      })
      const roomId = joinParams.room_session.room_id

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

      console.time(`time-reattach-${row.join_as}`)
      // Join again
      const reattachParams: any = await expectRoomJoinWithDefaults(page, {
        joinAs: row.join_as,
      })
      console.timeEnd(`time-reattach-${row.join_as}`)

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
      await row.expectMCU(page)

      // --------------- Reattaching again ---------------
      await page.reload()

      await createTestRoomSession(page, connectionSettings)

      console.time(`time-reattach-${row.join_as}-2`)
      // Join again
      const reattachParams2: any = await expectRoomJoinWithDefaults(page, {
        joinAs: row.join_as,
      })
      console.timeEnd(`time-reattach-${row.join_as}-2`)

      expect(reattachParams2.room).toBeDefined()
      expect(reattachParams2.room_session).toBeDefined()
      if (row.join_as === 'member') {
        expect(
          reattachParams2.room.members.some(
            (member: any) => member.id === reattachParams2.member_id
          )
        ).toBeTruthy()
      }
      // Make sure the room_id is stable
      expect(reattachParams2.room_session.room_id).toBe(roomId)

      expect(reattachParams2.room_session.name).toBe(roomName)
      expect(reattachParams2.room.name).toBe(roomName)
      // Make sure the member_id is stable
      expect(reattachParams2.member_id).toBeDefined()
      expect(reattachParams2.member_id).toBe(joinParams.member_id)
      // Also call_id must remain the same
      expect(reattachParams2.call_id).toBeDefined()
      expect(reattachParams2.call_id).toBe(joinParams.call_id)
      await row.expectMCU(page)

      await deleteRoom(roomId)
    })
  })
})
