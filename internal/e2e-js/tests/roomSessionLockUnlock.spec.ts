import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe.skip('RoomSession Lock/Unlock', () => {
  test('should join a room and be able to lock/unlock it', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: 'lock-unlock' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('lock-unlock-e2e')
    const permissions = ['room.lock', 'room.unlock']
    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'lockers',
        auto_create_room: true,
        permissions,
      },
      initialEvents: ['room.updated'],
    })

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)
    // Room locked must be false
    expect(joinParams.room_session.locked).toBe(false)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Lock the room ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const roomLocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (
              params.room_session.id === roomSessionId &&
              params.room_session.locked === true
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.lock()

        return roomLocked
      },
      { roomSessionId: joinParams.room_session.id }
    )

    /**
     * Check the MCU content??
     */

    await page.waitForTimeout(1000)

    // --------------- Unlock the room ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const roomUnlocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (
              params.room_session.id === roomSessionId &&
              params.room_session.locked === false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.unlock()

        return roomUnlocked
      },
      { roomSessionId: joinParams.room_session.id }
    )
  })
})
