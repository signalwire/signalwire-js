import { test, expect } from '../fixtures'
import { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
} from '../utils'

test.describe('RoomSession Audience Count', () => {
  test('should receive correct audience_count in events', async ({
    createCustomPage,
  }) => {
    const allPages = await Promise.all([
      createCustomPage({ name: '[page1]' }),
      createCustomPage({ name: '[page2]' }),
      createCustomPage({ name: '[page3]' }),
      createCustomPage({ name: '[page4]' }),
      createCustomPage({ name: '[page5]' }),
    ])
    const [pageOne, pageTwo, pageThree, pageFour, pageFive] = allPages
    const audiencePages = [pageTwo, pageThree, pageFour, pageFive]
    const expectedAudienceCount = audiencePages.length
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))

    const room_name = randomizeRoomName()

    const memberInitialEvents = ['room.audience_count']

    await createTestRoomSession(pageOne, {
      vrt: {
        room_name,
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: [],
        join_as: 'member',
      },
      initialEvents: memberInitialEvents,
    })

    await Promise.all(
      audiencePages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name,
            user_name: `e2e_audience_${i + 1}`,
            join_as: 'audience',
            permissions: [],
          },
          initialEvents: [],
        })
      })
    )

    // Joining the room and resolve when the total from room.audienceCount is equal to expectedAudienceCount
    const audienceCountPromise = pageOne.evaluate(
      ({ expectedAudienceCount }) => {
        return new Promise(async (resolve) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('room.audienceCount', (params) => {
            if (params.total === expectedAudienceCount) {
              resolve(params)
            }
          })

          await roomObj.join()
        })
      },
      { expectedAudienceCount }
    )

    // join as audience on pageTwo and resolve on `room.joined`
    const joinTwoParams: any = await expectRoomJoined(pageTwo)
    // expect to have only 1 audience in the room at the moment
    expect(joinTwoParams.room_session.audience_count).toBe(1)

    const [_, ...pageThreeToFive] = audiencePages
    // join as audiences on pageThree to pageFive and resolve on `room.joined`
    await Promise.all(pageThreeToFive.map((page) => expectRoomJoined(page)))

    // wait for all the room.audienceCount
    await audienceCountPromise
  })
})
