import { Video } from '@signalwire/js'
import { test, expect } from '../fixtures'
import {
  createTestRoomSession,
  expectRoomJoinWithDefaults,
  leaveRoom,
  randomizeRoomName,
  SERVER_URL,
} from '../utils'

test.describe('RoomSession', () => {
  test('it should join the room and then leave with cleanup', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('e2e-cleanup')
    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
      },
      initialEvents: [],
      attachSagaMonitor: true,
    })

    await expectRoomJoinWithDefaults(page)

    await test.step('the room should have workers and listeners attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        return {
          // @ts-expect-error
          roomSessionListenersLength: roomObj.sessionEventNames().length,
          // @ts-expect-error
          roomListenersLength: roomObj.eventNames().length,
          // @ts-expect-error
          roomWorkersLength: roomObj._runningWorkers.length,
          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.roomSessionListenersLength).toBeGreaterThan(0)
      expect(watchers.roomListenersLength).toBeGreaterThan(0)
      expect(watchers.roomWorkersLength).toBeGreaterThan(0)
      expect(watchers.globalWorkersLength).toBeGreaterThan(0)
    })

    await leaveRoom(page)

    await test.step('the room should not have any workers and listeners attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        return {
          // @ts-expect-error
          roomSessionListenersLength: roomObj.sessionEventNames().length,
          // @ts-expect-error
          roomListenersLength: roomObj.eventNames().length,
          // @ts-expect-error
          roomWorkersLength: roomObj._runningWorkers.length,
          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.roomSessionListenersLength).toBe(0)
      expect(watchers.roomListenersLength).toBe(0)
      expect(watchers.roomWorkersLength).toBe(0)
      expect(watchers.globalWorkersLength).toBe(0)
    })
  })
})
