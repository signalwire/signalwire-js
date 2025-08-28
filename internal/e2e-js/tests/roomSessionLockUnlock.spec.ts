import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
} from '../utils'

test.describe('RoomSession Lock/Unlock', () => {
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
    const joinedPromise = expectRoomJoinedEvent(page)
    await joinRoom(page)
    const joinParams = await joinedPromise

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)
    // Room locked must be false
    expect(joinParams.room_session.locked).toBe(false)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Lock the room ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { roomSessionId: joinParams.room_session.id },
      evaluateFn: async ({ roomSessionId }) => {
        const roomObj: Video.RoomSession = (window as any)._roomObj

        const roomLocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params: any) => {
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
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected room to be locked',
    })

    /**
     * Check the MCU content??
     */

    await page.waitForTimeout(1000)

    // --------------- Unlock the room ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { roomSessionId: joinParams.room_session.id },
      evaluateFn: async ({ roomSessionId }) => {
        const roomObj: Video.RoomSession = (window as any)._roomObj

        const roomUnlocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params: any) => {
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
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected room to be unlocked',
    })
  })
})
