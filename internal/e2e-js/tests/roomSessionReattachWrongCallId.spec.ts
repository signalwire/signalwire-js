import { test, expect } from '../fixtures'
import { uuid } from '@signalwire/core'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
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
      }
      await createTestRoomSession(page, connectionSettings)

      // --------------- Joining the room ---------------
      const joinedPromise = expectRoomJoinedEvent(page, {
        joinAs: row.join_as,
        message: `Waiting for room.joined (${row.join_as})`,
      })
      await joinRoom(page, { message: `Joining room as ${row.join_as}` })
      const joinParams = await joinedPromise

      expect(joinParams.room).toBeDefined()
      expect(joinParams.room_session).toBeDefined()
      if (row.join_as === 'member') {
        expect(
          joinParams.room.members.some(
            (member) => member.id === joinParams.member_id
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
        assertionFn: (roomPermissions) =>
          expect(roomPermissions).toStrictEqual(permissions),
        message: 'Expected room permissions to match',
      })

      // --------------- Reattaching ---------------
      await page.waitForTimeout(2000)

      await page.reload()

      // ----- Inject wrong callId --
      await expectPageEvalToPass(page, {
        evaluateArgs: { mockId: uuid(), roomName },
        evaluateFn: async ({ mockId, roomName }) => {
          const key = `ci-${roomName}`
          window.sessionStorage.setItem(key, mockId)
          console.log(`Injected callId for ${key} with value ${mockId}`)
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected to inject bogus callId into sessionStorage',
      })

      const reattachConnectionSettings = {
        vrt: {
          room_name: roomName,
          user_name: `e2e_reattach_wrong_callid_${row.join_as}`,
          join_as: row.join_as,
          auto_create_room: true,
          permissions,
        },
        initialEvents: [],
        expectToJoin: false,
      }
      await createTestRoomSession(page, reattachConnectionSettings)

      // ----- Join the room with a bogus call ID and expect an error --
      const joinError: any = await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomObj = window._roomObj as Video.RoomSession
          const error = await roomObj.join().catch((error) => error)
          return error
        },
        assertionFn: (err) => expect(err).toBeDefined(),
        message: 'Expected join() to return error for wrong callId',
      })

      expect(joinError.code).toBe('81')
      expect(joinError.message).toBe('INVALID_CALL_REFERENCE')
    })
  })
})
