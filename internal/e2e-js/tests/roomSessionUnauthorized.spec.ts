import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisibleForAudience,
  expectRoomJoinWithDefaults,
  expectPageEvalToPass,
} from '../utils'

test.describe('RoomSession unauthorized methods for audience', () => {
  test('should handle joining a room, try to perform unauthorized actions and then leave the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('e2e-403')
    const audiencePermissions: string[] = []

    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test_403',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: audiencePermissions,
      },
      initialEvents: [
        'member.joined',
        'member.left',
        'member.updated',
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.started',
        'room.updated',
      ],
    })

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoinWithDefaults(page, {
      joinAs: 'audience',
    })

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible, as audience
    await expectMCUVisibleForAudience(page)

    await expectPageEvalToPass(page, {
      evaluateFn: () => {
        const roomObj = window._roomObj as Video.RoomSession
        return roomObj.permissions
      },
      assertionFn: (roomPermissions) =>
        expect(roomPermissions).toStrictEqual(audiencePermissions),
      message: 'Expected audience permissions to match',
    })

    // --------------- Unmuting Audio (self) and expecting 403 ---------------
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const roomObj = window._roomObj as Video.RoomSession
        const error = await roomObj.audioUnmute().catch((error) => error)
        return error.code
      },
      assertionFn: (code) => expect(code).toBe('403'),
      message: 'Expected audioUnmute for audience to fail with 403',
    })
  })
})
