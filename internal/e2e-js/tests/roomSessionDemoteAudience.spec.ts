import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('RoomSession demote method', () => {
  test('should not be able to demote audience', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const memberSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const audienceSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_audience',
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
    const pageOneJoinedPromise = expectRoomJoinedEvent(pageOne, {
      message: 'Waiting for room.joined on pageOne',
    })
    await joinRoom(pageOne, { message: 'Joining room on pageOne' })
    await pageOneJoinedPromise

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoJoinedPromise = expectRoomJoinedEvent(pageTwo, {
      joinAs: 'audience',
      message: 'Waiting for room.joined on pageTwo (audience)',
    })
    await joinRoom(pageTwo, { message: 'Joining room on pageTwo (audience)' })
    const pageTwoRoomJoined: any = await pageTwoJoinedPromise

    // Checks that the video is visible on pageTwo
    await expectMCUVisibleForAudience(pageTwo)

    // --------------- Demote audience from pageOne and resolve on 404 ---------------
    const errorCode = await pageOne.evaluate(
      async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const error = await roomObj
          .demote({
            memberId: demoteMemberId,
          })
          .catch((error) => error)

        return error.code
      },
      { demoteMemberId: pageTwoRoomJoined.member_id }
    )
    expect(errorCode).toBe('404')

    // --------------- Make sure on pageTwo still have audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience still have recvonly ---------------
    await expectSDPDirection(pageTwo, 'recvonly', true)
  })
})
