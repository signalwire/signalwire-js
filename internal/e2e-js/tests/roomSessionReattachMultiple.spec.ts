import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  deleteRoom,
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

      const joinedPromise = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined (${row.join_as})`,
      })
      await joinRoom(page, { message: `Joining room as ${row.join_as}` })
      const joinParams: any = await joinedPromise
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

      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj = window._roomObj as Video.RoomSession
          return roomObj.permissions
        },
        assertionFn: (roomPermissions) =>
          expect(roomPermissions).toStrictEqual(permissions),
        message: 'Expected room permissions to match',
      })

      // --------------- Reattaching ---------------
      await page.reload()

      await createTestRoomSession(page, connectionSettings)

      console.time(`time-reattach-${row.join_as}`)
      // Join again
      const rejoinedPromise = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined after reattach (${row.join_as})`,
      })
      await joinRoom(page, { message: `Rejoining room as ${row.join_as}` })
      const reattachParams: any = await rejoinedPromise
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
      const rejoinedPromise2 = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined after reattach-2 (${row.join_as})`,
      })
      await joinRoom(page, { message: `Rejoining room (2) as ${row.join_as}` })
      const reattachParams2: any = await rejoinedPromise2
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
