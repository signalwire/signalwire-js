import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createTestRoomSessionWithJWT,
  randomizeRoomName,
  expectMCUVisible,
  expectRoomJoinWithDefaults,
  expectPageEvalToPass,
} from '../utils'

test.describe('RoomSessionReattachBadAuth', () => {
  test('should join a room, reattach with invalid authorization_state and then leave the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[reattach-bad-auth]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_test_bad_auth',
        auto_create_room: true,
        permissions,
      },
      initialEvents: [],
    }
    await createTestRoomSession(page, connectionSettings)

    // --------------- Joining the room ---------------
    const joinParams: any = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(
      joinParams.room.members.some(
        (member: any) => member.id === joinParams.member_id
      )
    ).toBeTruthy()
    expect(joinParams.room_session.name).toBe(roomName)
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await expectMCUVisible(page)

    await expectPageEvalToPass(page, {
      evaluateFn: () => {
        const roomObj = window._roomObj as Video.RoomSession
        return roomObj.permissions
      },
      assertionFn: (roomPermissions) =>
        expect(roomPermissions).toStrictEqual(permissions),
      message: 'Expected room permissions to match',
    })

    const jwtToken: string = await expectPageEvalToPass(page, {
      evaluateFn: () => {
        // @ts-expect-error
        return window.jwt_token
      },
      assertionFn: (token) => expect(token).toBeDefined(),
      message: 'Expected JWT token to be defined',
    })

    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSessionWithJWT(page, connectionSettings, jwtToken)

    // Join again but with a bogus authorization_state
    const joinResponse: any = await expectPageEvalToPass(page, {
      evaluateArgs: joinParams.room_session.name,
      evaluateFn: async (roomName) => {
        const roomObj = window._roomObj as Video.RoomSession

        // Inject wrong values for authorization state
        const key = `as-${roomName}`
        const state = btoa('just wrong')
        window.sessionStorage.setItem(key, state)
        console.log(
          `Injected authorization state for ${key} with value ${state}`
        )

        // Now try to reattach, which should not succeed
        return roomObj.join().catch((error) => error)
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected join() to return an error object',
    })

    const { code, message } = joinResponse
    expect([-32002, '27']).toContain(code)
    expect([
      'CALL ERROR',
      'DESTINATION_OUT_OF_ORDER',
      'Cannot reattach this call with this member ID',
    ]).toContain(message)
  })
})
