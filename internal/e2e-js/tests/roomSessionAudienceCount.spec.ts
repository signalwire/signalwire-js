import type { Page } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
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
    const audiencePages = [pageTwo, pageThree, pageFour, pageFive] as const
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

    const expectAudienceCount = (page: Page) => {
      return {
        getTotals: () => {
          return expectPageEvalToPass(page, {
            evaluateFn: () => {
              return {
                totalFromAudienceCount: (window as any)
                  .__totalFromAudienceCount,
              }
            },
            assertionFn: (res) => expect(res).toBeDefined(),
            message: 'Expected audience totals to be readable',
          })
        },
        waitFor: (count: number) => {
          return expectPageEvalToPass(page, {
            evaluateArgs: { count },
            evaluateFn: ({ count }) => {
              return new Promise((resolve) => {
                ;(window as any).__totalFromAudienceCount = 0
                const roomObj = window._roomObj as Video.RoomSession
                roomObj.on('room.audienceCount', (params: any) => {
                  ;(window as any).__totalFromAudienceCount = params.total
                  if (params.total === count) {
                    resolve(params)
                  }
                })
              })
            },
            assertionFn: (params) => {
              expect(params).toBeDefined()
            },
            timeout: 50_000,
            intervals: [50_000],
            message: 'Expected room.audienceCount to reach expected total',
          })
        },
      }
    }

    // Joining the room and resolve when the total from room.audienceCount is equal to expectedAudienceCount
    const expectorPageOne = expectAudienceCount(pageOne)
    const audienceCountPageOnePromise = expectorPageOne.waitFor(
      expectedAudienceCount
    )

    const pageOneJoinedPromise = expectRoomJoinedEvent(pageOne, {
      joinAs: 'member',
      message: 'Waiting for room.joined on pageOne',
    })
    await joinRoom(pageOne, { message: 'Joining room on pageOne' })
    await pageOneJoinedPromise

    const expectorPageTwo = expectAudienceCount(pageTwo)
    const audienceCountPageTwoPromise = expectorPageTwo.waitFor(
      expectedAudienceCount
    )

    // join as audience on pageTwo and resolve on `room.joined`
    const pageTwoJoinedPromise = expectRoomJoinedEvent(pageTwo, {
      joinAs: 'audience',
      message: 'Waiting for room.joined on pageTwo as audience',
    })
    await joinRoom(pageTwo, { message: 'Joining room on pageTwo as audience' })
    const joinTwoParams = await pageTwoJoinedPromise
    // expect to have only 1 audience in the room at the moment
    // @ts-expect-error FIXME: Check why `audience_count` is not exposed on the RoomSessionEntity
    expect(joinTwoParams.room_session.audience_count).toBe(1)

    const [_, ...pageThreeToFive] = audiencePages
    // join as audiences on pageThree to pageFive and resolve on `room.joined`
    await Promise.all(
      pageThreeToFive.map((page, index) => {
        expectRoomJoinedEvent(page, {
          joinAs: 'audience',
          message: `Waiting for room.joined on page${index + 3} as audience`,
        })
        return joinRoom(page, { message: 'Joining room as audience' })
      })
    )

    // wait for all the room.audienceCount
    await Promise.all([
      audienceCountPageOnePromise,
      audienceCountPageTwoPromise,
    ])

    const totalsPageOne = await expectorPageOne.getTotals()
    expect(totalsPageOne.totalFromAudienceCount).toBe(expectedAudienceCount)

    const totalsPageTwo = await expectorPageTwo.getTotals()
    expect(totalsPageTwo.totalFromAudienceCount).toBe(expectedAudienceCount)
  })
})
