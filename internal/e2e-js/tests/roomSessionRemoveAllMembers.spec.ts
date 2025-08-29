import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectPageReceiveAudio,
  randomizeRoomName,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('RoomSession removeAllMembers method', () => {
  test('should remove all members from a room', async ({
    createCustomPage,
  }) => {
    const allPages = await Promise.all([
      createCustomPage({ name: '[page1]' }),
      createCustomPage({ name: '[page2]' }),
      createCustomPage({ name: '[page3]' }),
    ])
    const [pageOne, pageTwo, pageThree] = allPages
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))

    const room_name = randomizeRoomName()

    await Promise.all(
      allPages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name,
            user_name: `e2e_removeall_${i + 1}`,
            permissions: i === 0 ? ['room.member.remove'] : [],
          },
          initialEvents: [
            'member.joined',
            'member.updated',
            'member.left',
            'layout.changed',
          ],
        })
      })
    )

    await Promise.all(
      allPages.map((page, index) => {
        const joined = expectRoomJoinedEvent(page, {
          message: `Waiting for room.joined on page${
            index + 1
          } (removeAllMembers)`,
        })
        return joinRoom(page, {
          message: `Joining room on page${index + 1} (removeAllMembers)`,
        }).then(() => joined)
      })
    )
    await Promise.all(allPages.map((page) => expectMCUVisible(page)))
    await Promise.all(allPages.map((page) => expectPageReceiveAudio(page)))

    await pageOne.waitForTimeout(2000)

    const promiseWaitForMember2Left = pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        const roomObj = window._roomObj as Video.RoomSession
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })
    })

    const promiseWaitForMember3Left = pageThree.evaluate(() => {
      return new Promise((resolve) => {
        const roomObj = window._roomObj as Video.RoomSession
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })
    })

    await pageOne.evaluate(async () => {
      const roomObj = window._roomObj as Video.RoomSession

      const promiseWaitForMember1Left = new Promise((resolve) => {
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })

      await roomObj.removeAllMembers()
      return promiseWaitForMember1Left
    })

    await Promise.all([promiseWaitForMember2Left, promiseWaitForMember3Left])

    await pageOne.waitForTimeout(5_000)
  })
})
