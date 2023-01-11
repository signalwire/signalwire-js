import { test } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSession talking events to audience', () => {
  test('audience should receive talking events', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const memberSettings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.talking'],
    }

    const audienceSettings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_audience',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.talking'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, memberSettings),
      createTestRoomSession(pageTwo, audienceSettings),
    ])

    // --------------- Joining from the 2nd tab as audience and resolve on 'room.joined' ---------------
    await expectRoomJoined(pageTwo)

    // Checks that the video is visible on pageTwo
    await expectMCUVisible(pageTwo)

    // --------------- Resolve when audience receives member.talking ----------
    const audienceMemberTalkingPromise = pageTwo.evaluate(async () => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('member.talking', resolve)
      })
    })

    await pageTwo.waitForTimeout(1000)

    // --------------- Joining from the 1st tab as member and resolve on 'room.joined' ---------------
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // Wait for `member.talking` on pageTwo
    await audienceMemberTalkingPromise
  })
})
