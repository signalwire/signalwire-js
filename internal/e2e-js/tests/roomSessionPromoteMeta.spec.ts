import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectRoomJoined,
  expectMCUVisible,
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
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined = await expectRoomJoined(pageTwo)

    // Checks that the video is visible on pageTwo
    await expectMCUVisible(pageTwo)

    // ------- Promote audience from pageOne and resolve on `member.joined` and pageTwo room.joined ----
    const promiseAudienceRoomSubscribed = pageTwo.evaluate(() => {
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
            new Error('[room.joined] missing meta after checking all members')
          )
        })
      })
    })

    const promisePromoterRoomJoined = pageOne.evaluate(
      async ({ promoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForMemberJoined = new Promise((resolve, reject) => {
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

        await roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
          meta: { vip: true },
        })

        return waitForMemberJoined
      },
      { promoteMemberId: pageTwoRoomJoined.member_id }
    )

    await Promise.all([
      promiseAudienceRoomSubscribed,
      promisePromoterRoomJoined,
    ])

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure on pageTwo we have a member now ---------------
    await expectInteractivityMode(pageTwo, 'member')

    // --------------- Check SDP/RTCPeer on audience (now member so sendrecv) ---------------
    await expectSDPDirection(pageTwo, 'sendrecv', true)
  })
})
