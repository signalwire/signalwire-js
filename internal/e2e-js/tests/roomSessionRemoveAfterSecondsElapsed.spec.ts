import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  randomizeRoomName,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  autoCreateRoom: boolean
  cleanup: boolean
}
test.describe('RoomSession remove_after_seconds_elapsed', () => {
  const tests: TestConfig[] = [
    {
      testName: 'static from room config',
      roomName: 'e2e-remove-after-seconds-elapsed',
      autoCreateRoom: false,
      cleanup: false,
    },
    {
      testName: 'random room name from room config',
      roomName: randomizeRoomName('e2e-remove-after-seconds-elapsed'),
      autoCreateRoom: false,
      cleanup: true,
    },
    {
      testName: 'from VRT',
      roomName: 'e2e-remove-after-seconds-elapsed-vrt',
      autoCreateRoom: true,
      cleanup: false,
    },
  ]

  tests.forEach((row) => {
    test(`should remove the member after X seconds elapsed [${row.testName}]`, async ({
      page,
    }) => {
      let roomData: any = {}

      await page.goto(SERVER_URL)

      const removeAfter = 5
      if (!row.autoCreateRoom) {
        roomData = await createOrUpdateRoom({
          name: row.roomName,
          remove_after_seconds_elapsed: removeAfter,
        })
      }

      await createTestRoomSession(page, {
        vrt: {
          room_name: row.roomName,
          user_name: 'member',
          auto_create_room: Boolean(row.autoCreateRoom),
          permissions: [],
          remove_after_seconds_elapsed: row.autoCreateRoom
            ? removeAfter
            : undefined,
        },
        initialEvents: [],
      })

      // --------------- Joining the room and wait first `room.joined` and then `room.left` ---------------
      await page.evaluate(async () => {
        return new Promise((resolve) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('room.joined', () => {
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })

          roomObj.join()
        })
      })

      // Checks that all the elements added by the SDK are gone.
      const targetElementsCount = await page.evaluate(() => {
        return {
          videos: Array.from(document.querySelectorAll('video')).length,
          rootEl: document.getElementById('rootElement')!.childElementCount,
        }
      })
      expect(targetElementsCount.videos).toBe(0)
      expect(targetElementsCount.rootEl).toBe(0)

      if (row.cleanup) {
        await deleteRoom(roomData.id)
      }
    })
  })
})
