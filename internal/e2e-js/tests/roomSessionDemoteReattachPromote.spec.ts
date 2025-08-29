import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMemberId,
  randomizeRoomName,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('RoomSession demote participant, reattach and then promote again', () => {
  test('should demote participant, reattach and then promote again', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: 'pageOne' })
    const pageTwo = await createCustomPage({ name: 'pageTwo' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const room_name = randomizeRoomName()

    const participant1Settings = {
      vrt: {
        room_name: room_name,
        user_name: 'e2e_participant',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const participant2Settings = {
      vrt: {
        room_name: room_name,
        user_name: 'e2e_target_participant',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, participant1Settings),
      createTestRoomSession(pageTwo, participant2Settings),
    ])

    const pageOneJoinedPromise = expectRoomJoinedEvent(pageOne, {
      message: 'Waiting for room.joined on pageOne',
    })
    await joinRoom(pageOne, { message: 'Joining room on pageOne' })
    await pageOneJoinedPromise
    await expectMCUVisible(pageOne)

    const pageTwoJoinedPromise = expectRoomJoinedEvent(pageTwo, {
      message: 'Waiting for room.joined on pageTwo',
    })
    await joinRoom(pageTwo, { message: 'Joining room on pageTwo' })
    const pageTwoRoomJoined: any = await pageTwoJoinedPromise
    const participant2Id = pageTwoRoomJoined.member_id
    await expectMemberId(pageTwo, participant2Id)
    await expectMCUVisible(pageTwo)

    // --------------- Sessions established ---------------

    await pageTwo.waitForTimeout(1000)

    const promiseAudienceRoomJoined = pageTwo.evaluate<any>(() => {
      return new Promise((resolve) => {
        const roomObj = window._roomObj as Video.RoomSession
        roomObj.once('room.joined', resolve)
      })
    })

    // --------------- Demote participant on pageTwo to audience from pageOne
    // and resolve on `member.left` amd `layout.changed` with position off-canvas ---------------
    await pageOne.evaluate(
      async ({ demoteMemberId }) => {
        const roomObj = window._roomObj as Video.RoomSession

        const waitForLayoutChangedDemotedInvisible = new Promise(
          (resolve, reject) => {
            roomObj.on('layout.changed', ({ layout }) => {
              for (const layer of layout.layers) {
                if (
                  layer.member_id === demoteMemberId &&
                  layer.visible === true
                ) {
                  reject(
                    new Error(
                      '[layout.changed] Demoted member is still visible'
                    )
                  )
                }
              }
              resolve(true)
            })
          }
        )

        const waitForMemberLeft = new Promise((resolve, reject) => {
          roomObj.on('member.left', ({ member }) => {
            if (member.name === 'e2e_target_participant') {
              resolve(true)
            } else {
              reject(
                new Error('[member.left] Name is not "e2e_target_participant"')
              )
            }
          })
        })

        await roomObj.demote({
          memberId: demoteMemberId,
        })

        return Promise.all([
          waitForLayoutChangedDemotedInvisible,
          waitForMemberLeft,
        ])
      },
      { demoteMemberId: participant2Id }
    )

    const audienceRoomJoined = await promiseAudienceRoomJoined

    // --------------- Make sure member_id is the same after demote on pageTwo ---------------
    await expectMemberId(pageTwo, participant2Id) // before demote
    await expectMemberId(pageTwo, audienceRoomJoined.member_id) // after demote

    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)

    // --------------- Let's wait a bit before reattaching ---------------
    await pageTwo.waitForTimeout(2000)

    // --------------- Reattach after demotion ---------------
    await pageTwo.reload()

    // It's now an audience user
    const participant2DemotedSettings = {
      vrt: {
        room_name: room_name,
        user_name: 'e2e_target_participant',
        auto_create_room: true,
        join_as: 'audience' as const,
        permissions: [],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await createTestRoomSession(pageTwo, participant2DemotedSettings)

    console.time('reattach')
    // Join again
    const rejoinedPromise = expectRoomJoinedEvent(pageTwo, {
      joinAs: 'audience',
      message: 'Waiting for room.joined on pageTwo after reattach',
    })
    await joinRoom(pageTwo, { message: 'Rejoining room on pageTwo (audience)' })
    const reattachParams: any = await rejoinedPromise
    console.timeEnd('reattach')

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(reattachParams.room_session.name).toBe(room_name)
    expect(reattachParams.room.name).toBe(room_name)
    // Make sure the member_id is stable
    expect(reattachParams.member_id).toBeDefined()
    expect(reattachParams.member_id).toBe(audienceRoomJoined.member_id)
    // Also call_id must remain the same
    expect(reattachParams.call_id).toBeDefined()
    expect(reattachParams.call_id).toBe(audienceRoomJoined.call_id)

    await expectMCUVisibleForAudience(pageTwo)
    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)

    await pageTwo.waitForTimeout(1000)

    // --------------- Time to promote again at PageTwo ---------------

    const promisePromotedRoomJoined = expectRoomJoinedEvent(pageTwo, {
      message: 'Waiting for room.joined on pageTwo after promote',
    })

    const promiseMemberWaitingForMemberJoin = pageOne.evaluate(
      async ({ promoteMemberId }) => {
        const roomObj = window._roomObj as Video.RoomSession

        const waitForMemberJoined = new Promise((resolve, reject) => {
          roomObj.on('member.joined', ({ member }) => {
            if (
              member.name === 'e2e_target_participant' &&
              member.id === promoteMemberId
            ) {
              resolve(true)
            } else {
              reject(
                new Error(
                  '[member.joined] Name is not "e2e_target_participant"'
                )
              )
            }
          })
        })

        await roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
        })

        return waitForMemberJoined
      },
      { promoteMemberId: participant2Id }
    )

    await Promise.all([
      promiseMemberWaitingForMemberJoin,
      promisePromotedRoomJoined,
    ])

    await expectMemberId(pageTwo, participant2Id)
    await expectInteractivityMode(pageTwo, 'member')
    await expectSDPDirection(pageTwo, 'sendrecv', true)
    await expectMCUVisible(pageTwo)
  })
})
