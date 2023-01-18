import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createTestRoomSessionWithJWT,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSessionReattachBadAuth', () => {
  test('join a room, reattach with invalid authorization_state and then leave the room', async ({
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
      roomSessionOptions: {
        _hijack: true, // FIXME: to remove
      },
    }
    await createTestRoomSession(page, connectionSettings)

    // --------------- Joining the room ---------------
    const joinParams: any = await expectRoomJoined(page)

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

    const roomPermissions: any = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(permissions)

    const jwtToken: string = await page.evaluate(() => {
      // @ts-expect-error
      return window.jwt_token
    })

    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSessionWithJWT(page, connectionSettings, jwtToken)

    // Join again but with a bogus authorization_state
    const joinResponse: any = await page.evaluate(async (roomName) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      // Inject wrong values for authorization state
      const key = `as-${roomName}-member`
      const state = btoa('just wrong')
      window.sessionStorage.setItem(key, state)
      console.log(`Injected authorization state for ${key} with value ${state}`)

      // Now try to reattach, which should not succeed
      return roomObj.join().catch((error) => error)
    }, joinParams.room_session.name)

    const { code, message } = joinResponse
    expect([-32002, '27']).toContain(code)
    expect(['CALL ERROR', 'DESTINATION_OUT_OF_ORDER']).toContain(message)
  })
})
