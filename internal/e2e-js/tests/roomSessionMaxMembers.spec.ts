import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  createRoom,
  randomizeRoomName,
  deleteRoom,
  expectRoomJoinWithDefaults,
} from '../utils'

test.describe('Room Session Max Members', () => {
  test('should fail to join when max_member is reached', async ({
    createCustomPage,
  }) => {
    const allPages = await Promise.all([
      createCustomPage({ name: '[pageOne]' }),
      createCustomPage({ name: '[pageTwo]' }),
      createCustomPage({ name: '[pageThree]' }),
    ])

    const [pageOne, pageTwo, pageThree] = allPages

    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))

    const roomName = randomizeRoomName('max_member_e2e')

    const roomData = await createRoom({
      name: roomName,
      max_members: 2,
    })

    await Promise.all(
      allPages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name: roomName,
            user_name: `member_${i + i}`,
            auto_create_room: false,
            permissions: ['room.stream'],
          },
          initialEvents: ['stream.started', 'stream.ended'],
        })
      })
    )

    await test.step('joining a room from pageOne', async () => {
      await expectRoomJoinWithDefaults(pageOne)
      await expectMCUVisible(pageOne)
    })

    await test.step('joining a room from pageTwo', async () => {
      await expectRoomJoinWithDefaults(pageTwo)
      await expectMCUVisible(pageTwo)
    })

    // setting up an expected rejection for the 3rd member
    await test.step('joining a room from pageThree', async () => {
      const joinRoom = pageThree.evaluate(() => {
        return new Promise<any>(async (resolve, reject) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.once('room.joined', resolve)

          try {
            await roomObj.join()
          } catch (e) {
            reject(e)
          }
        })
      })
      await expect(joinRoom).rejects.toBeTruthy()
    })

    await deleteRoom(roomData.id)
  })
})
