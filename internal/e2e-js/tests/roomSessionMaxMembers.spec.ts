import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  createRoom,
  randomizeRoomName,
  deleteRoom,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('Room Session Max Members', () => {
  test('Should fail to join when max_member is reached', async ({
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

    await Promise.all([
      (async () => {
        const p = expectRoomJoinedEvent(pageOne, {
          message: 'Waiting for room.joined (max members pageOne)',
        })
        await joinRoom(pageOne, {
          message: 'Joining room (max members pageOne)',
        })
        await p
      })(),
      (async () => {
        const p = expectRoomJoinedEvent(pageTwo, {
          message: 'Waiting for room.joined (max members pageTwo)',
        })
        await joinRoom(pageTwo, {
          message: 'Joining room (max members pageTwo)',
        })
        await p
      })(),
    ])

    await Promise.all([expectMCUVisible(pageOne), expectMCUVisible(pageTwo)])

    await pageOne.waitForTimeout(2000)

    // setting up an expected rejection for the 3rd member
    const roomJoined = pageThree.evaluate(() => {
      return new Promise<any>(async (resolve, reject) => {
        const roomObj = window._roomObj as Video.RoomSession
        roomObj.once('room.joined', resolve)
        try {
          await roomObj.join()
        } catch (e) {
          reject(e)
        }
      })
    })

    await expect(roomJoined).rejects.toBeTruthy()

    await deleteRoom(roomData.id)
  })
})
