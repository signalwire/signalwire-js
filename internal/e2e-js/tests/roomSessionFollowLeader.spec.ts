import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectStatWithPolling,
  randomizeRoomName,
  expectRoomJoinWithDefaults,
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

    await test.step('join room from page1 as a member', async () => {
      await expectRoomJoinWithDefaults(pageOne, { joinAs: 'member' })
      await expectMCUVisible(pageOne)
      await expectStatWithPolling(pageOne, {
        propertyPath: 'inboundRTP.audio.totalAudioEnergy',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })

    await test.step('join room from page2 as a member', async () => {
      await expectRoomJoinWithDefaults(pageTwo, { joinAs: 'member' })
      await expectMCUVisible(pageTwo)
      await expectStatWithPolling(pageTwo, {
        propertyPath: 'inboundRTP.audio.totalAudioEnergy',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })

    await test.step('join room from page3 as an audience', async () => {
      await expectRoomJoinWithDefaults(pageThree, { joinAs: 'audience' })
      await expectMCUVisibleForAudience(pageThree)
      await expectStatWithPolling(pageThree, {
        propertyPath: 'inboundRTP.audio.totalAudioEnergy',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })

    const roomLeftEventPromisePage1 =
      test.step('room.left event on page1', () => {
        return pageOne.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    const roomLeftEventPromisePage2 =
      test.step('room.left event on page2', () => {
        return pageTwo.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    const roomLeftEventPromisePage3 =
      test.step('room.left event on page3', () => {
        return pageThree.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('room.left', () => {
              resolve(true)
            })
          })
        })
      })

    // Leaving the room from pageOne should make all members leave the room
    await test.step('leader leave the room', async () => {
      await pageOne.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.leave()
      })
    })

    await Promise.all([
      roomLeftEventPromisePage1,
      roomLeftEventPromisePage2,
      roomLeftEventPromisePage3,
    ])
  })
})
