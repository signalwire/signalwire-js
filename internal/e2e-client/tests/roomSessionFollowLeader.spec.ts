import { test } from '../fixtures'
import type { Video } from '@signalwire/client'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectPageReceiveAudio,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSession end_room_session_on_leave feature', () => {
  test('should remove all members from a room once the leader leave', async ({
    createCustomPage,
  }) => {
    const allPages = await Promise.all([
      createCustomPage({ name: '[page1]' }),
      createCustomPage({ name: '[page2]' }),
      createCustomPage({ name: '[page3]' }),
    ])
    const [pageOne, pageTwo, pageThree] = allPages
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))

    const room_name = randomizeRoomName('follow-leader-e2e')

    await Promise.all(
      allPages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name,
            user_name: `e2e_follow_leader_${i + 1}`,
            permissions: [],
            end_room_session_on_leave: i === 0, // make 1st the "leader"
            join_as: i === allPages.length - 1 ? 'audience' : 'member', // makes last audience
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

    await Promise.all(allPages.map((page) => expectRoomJoined(page)))
    // last page is audience                                            
    await Promise.all(allPages.map((page, i) => i === allPages.length - 1 ? expectMCUVisibleForAudience(page) : expectMCUVisible(page)))
    await Promise.all(allPages.map((page) => expectPageReceiveAudio(page)))

    await pageOne.waitForTimeout(2000)

    const promiseWaitForMember2Left = pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })
    })

    const promiseWaitForMember3Left = pageThree.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })
    })

    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const promiseWaitForMember1Left = new Promise((resolve) => {
        roomObj.on('room.left', () => {
          resolve(true)
        })
      })

      await roomObj.leave()
      return await promiseWaitForMember1Left
    })

    await Promise.all([promiseWaitForMember2Left, promiseWaitForMember3Left])
  })
})
