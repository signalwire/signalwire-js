import { test, expect } from '../fixtures'
import { uuid } from '@signalwire/core'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSessionReattachWrongCallId', () => {
  test('should handle joining a room, reattaching with wrong callID and then leaving the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[reattach-bad-call-id]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_test_wrong_call_id',
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

    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSession(page, connectionSettings)

    // Try to join but expect to join with a different callId/memberId
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

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(
      reattachParams.room.members.some(
        (member: any) => member.id === reattachParams.member_id
      )
    ).toBeTruthy()
    expect(reattachParams.room_session.name).toBe(roomName)
    expect(reattachParams.room.name).toBe(roomName)

    // Same room_session_id
    expect(reattachParams.room_session.id).toBe(joinParams.room_session.id)
    // Different memberId and callId
    expect(reattachParams.member_id).not.toBe(joinParams.member_id)
    expect(reattachParams.call_id).not.toBe(joinParams.call_id)

    // Checks that the video is visible
    await expectMCUVisible(page)
  })
})
