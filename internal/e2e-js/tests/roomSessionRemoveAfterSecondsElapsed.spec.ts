import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  randomizeRoomName,
  expectPageEvalToPass,
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
      createCustomPage,
    }) => {
      let roomData: any = {}

      const page = await createCustomPage({
        name: '[removeAfterSecElapsedPage]',
      })
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
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          return new Promise(async (resolve) => {
            const roomObj = window._roomObj as Video.RoomSession
            roomObj.on('room.joined', () => {
              roomObj.on('room.left', () => {
                resolve(true)
              })
            })

            await roomObj.join()
          })
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected to join and then receive room.left',
      })

      // Checks that all the elements added by the SDK are gone.
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          return {
            videos: Array.from(document.querySelectorAll('video')).length,
            rootEl: document.getElementById('rootElement')!.childElementCount,
          }
        },
        assertionFn: (counts: any) => {
          expect(counts.videos).toBe(0)
          expect(counts.rootEl).toBe(0)
        },
        message: 'Expected SDK elements to be removed after room.left',
      })

      if (row.cleanup) {
        await deleteRoom(roomData.id)
      }
    })
  })
})
