import { test } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSession talking events to participant', () => {
  test('participant should receive talking events', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const member1Settings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_member1',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.talking'],
    }

    const member2Settings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_member2',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.talking'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, member1Settings),
      createTestRoomSession(pageTwo, member2Settings),
    ])

    // --------------- Join from the 2nd and resolve on 'room.joined' ---------
    await expectRoomJoined(pageTwo)

    // Checks that the video is visible on pageTwo
    await expectMCUVisible(pageTwo)

    // --------------- Resolve when member2 receives member.talking ----------
    const member2TalkingPromise = pageTwo.evaluate(async () => {
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
    await member2TalkingPromise
  })
})
