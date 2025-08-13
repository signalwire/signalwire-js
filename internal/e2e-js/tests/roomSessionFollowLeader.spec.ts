import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectPageReceiveAudio,
  randomizeRoomName,
  expectRoomJoinWithDefaults,
  expectToPass,
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

    // Last page is audience
    await Promise.all(
      allPages.map((page, i) =>
        i === allPages.length - 1
          ? expectRoomJoinWithDefaults(page, { joinAs: 'audience' })
          : expectRoomJoinWithDefaults(page, { joinAs: 'member' })
      )
    )
    await Promise.all(
      allPages.map((page, i) =>
        i === allPages.length - 1
          ? expectMCUVisibleForAudience(page)
          : expectMCUVisible(page)
      )
    )
    await Promise.all(allPages.map((page) => expectPageReceiveAudio(page)))

    const memberLeftEvent = expectToPass(
      async () => {
        const result = await pageTwo.evaluate(async () => {
          return new Promise<boolean>((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
        expect(result).toBe(true)
      },
      { message: 'member left event' }
    )

    const audienceLeftEvent = expectToPass(
      async () => {
        const result = await pageThree.evaluate(async () => {
          return new Promise<boolean>((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
        expect(result).toBe(true)
      },
      { message: 'audience member left event' }
    )

    const leaderLeftEvent = expectToPass(
      async () => {
        const result = await pageOne.evaluate(async () => {
          return new Promise<boolean>((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
        expect(result).toBe(true)
      },
      { message: 'leader member left event' }
    )

    await expectToPass(
      async () => {
        const result = await pageOne.evaluate(async () => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          await roomObj.leave()
          return true
        })
        expect(result).toBe(true)
      },
      { message: 'leader member left' }
    )

    await Promise.all([leaderLeftEvent, audienceLeftEvent, memberLeftEvent])
  })
})
