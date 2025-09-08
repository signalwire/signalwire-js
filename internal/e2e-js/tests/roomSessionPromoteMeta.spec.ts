import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectRoomJoinWithDefaults,
} from '../utils'

test.describe('RoomSession promote updating member meta', () => {
  test('should promote audience setting the meta field', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const memberSettings = {
      vrt: {
        room_name: 'promotion-room-meta',
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const audienceSettings = {
      vrt: {
        room_name: 'promotion-room-meta',
        user_name: 'e2e_audience_meta',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, memberSettings),
      createTestRoomSession(pageTwo, audienceSettings),
    ])

    // --------------- Joining from the 1st tab as member and resolve on 'room.joined' ---------------
    await test.step('join room from pageOne as a member', async () => {
      await expectRoomJoinWithDefaults(pageOne, { joinAs: 'member' })
    })

    // Checks that the video is visible on pageOne
    await test.step('expect video to be visible on pageOne', async () => {
      await expectMCUVisible(pageOne)
    })

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined =
      await test.step('join room from pageTwo as an audience', async () => {
        return expectRoomJoinWithDefaults(pageTwo, {
          joinAs: 'audience',
        })
      })

    // Checks that the video is visible on pageTwo
    await test.step('expect video to be visible on pageTwo', async () => {
      await expectMCUVisibleForAudience(pageTwo)
    })

    // ------- Promote audience from pageOne and resolve on `member.joined` and pageTwo room.joined ----
    const promiseAudienceRoomSubscribed =
      test.step('pageTwo should receive room.joined event with correct meta', () => {
        return pageTwo.evaluate(() => {
          return new Promise((resolve, reject) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj

            roomObj.once('room.joined', ({ room_session }) => {
              for (let member of room_session.members) {
                if (member.name === 'e2e_audience_meta') {
                  if (member.meta && member.meta['vip'] === true) {
                    resolve(true)
                  } else {
                    reject(new Error('[room.joined] missing meta'))
                  }
                }
              }
              reject(
                new Error(
                  '[room.joined] missing meta after checking all members'
                )
              )
            })
          })
        })
      })

    const promisePromoterRoomJoined =
      test.step('pageOne should receive member.joined event with correct meta', () => {
        return pageOne.evaluate(async () => {
          return new Promise((resolve, reject) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj
            roomObj.on('member.joined', ({ member }) => {
              if (member.name === 'e2e_audience_meta') {
                if (member.meta && member.meta['vip'] === true) {
                  resolve(true)
                } else {
                  reject(new Error('[member.joined] missing meta'))
                }
              } else {
                reject(
                  new Error('[member.joined] Name is not "e2e_audience_meta"')
                )
              }
            })
          })
        })
      })

    await test.step('promote audience to member from pageOne', async () => {
      return pageOne.evaluate(
        async ({ promoteMemberId }) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          await roomObj.promote({
            memberId: promoteMemberId,
            permissions: ['room.list_available_layouts'],
            meta: { vip: true },
          })
        },
        { promoteMemberId: pageTwoRoomJoined.memberId }
      )
    })

    await Promise.all([
      promiseAudienceRoomSubscribed,
      promisePromoterRoomJoined,
    ])

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure on pageTwo we have a member now ---------------
    await test.step('make sure pageTwo is now a member', async () => {
      await expectInteractivityMode(pageTwo, 'member')
    })

    // --------------- Check SDP/RTCPeer on audience (now member so sendrecv) ---------------
    await test.step('expect pageTwo to have sendrecv SDP', async () => {
      await expectSDPDirection(pageTwo, 'sendrecv', true)
    })
  })
})
