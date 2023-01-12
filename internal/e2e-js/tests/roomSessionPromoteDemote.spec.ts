import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMemberId,
  expectLayoutChanged,
  setLayoutOnPage,
  expectRoomJoined,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectTotalAudioEnergyToBeGreaterThan,
} from '../utils'

test.describe('RoomSession promote/demote methods', () => {
  test('should promote/demote audience', async ({ createCustomPage }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const memberSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: [
          'room.member.demote',
          'room.member.promote',
          'room.set_layout',
        ],
      },
      initialEvents: [
        'member.joined',
        'member.updated',
        'member.left',
        'layout.changed',
      ],
    }

    const audienceSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_audience',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: [
        'member.joined',
        'member.updated',
        'member.left',
        'layout.changed',
      ],
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

    // Stable ref of the initial memberId for the audience
    const audienceId = pageTwoRoomJoined.member_id

    // Checks that the video is visible on pageTwo
    await expectMCUVisibleForAudience(pageTwo)

    // --------------- Check that the audience member on pageTwo is receiving non-silence ---------------
    await pageOne.waitForTimeout(5000)
    await expectTotalAudioEnergyToBeGreaterThan(pageTwo, 0.1)

    await pageOne.waitForTimeout(5000)
    await expectTotalAudioEnergyToBeGreaterThan(pageTwo, 0.5)

    // --------------- Make sure a `layout.changed` reached both member and audience --------------

    const layoutName = '3x3'
    // --------------- Expect layout to change ---------------
    const layoutChangedPageOne = expectLayoutChanged(pageOne, layoutName)
    const layoutChangedPageTwo = expectLayoutChanged(pageTwo, layoutName)

    // --------------- Set layout ---------------
    await setLayoutOnPage(pageOne, layoutName)

    const layoutChangedResults = await Promise.all([
      layoutChangedPageOne,
      layoutChangedPageTwo,
    ])
    expect(layoutChangedResults).toStrictEqual([true, true])

    // --------------- Promote audience from pageOne and resolve on `member.joined` ---------------
    await pageOne.evaluate(
      async ({ promoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForMemberJoined = new Promise((resolve, reject) => {
          roomObj.on('member.joined', ({ member }) => {
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.joined] Name is not "e2e_audience"'))
            }
          })
        })

        await roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
        })

        return waitForMemberJoined
      },
      { promoteMemberId: audienceId }
    )

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure pageTwo exposes the correct memberId  ---------------
    await expectMemberId(pageTwo, audienceId)

    // --------------- Make sure on pageTwo we have a member now ---------------
    await expectInteractivityMode(pageTwo, 'member')

    // --------------- Check SDP/RTCPeer on audience (now member so sendrecv) ---------------
    await expectSDPDirection(pageTwo, 'sendrecv', true)

    await pageTwo.waitForTimeout(2000)

    const promiseAudienceRoomJoined = expectRoomJoined(pageTwo, {
      invokeJoin: false,
    })

    // --------------- Demote to audience again from pageOne and resolve on `member.left` amd `layout.changed` with position off-canvas ---------------
    const promiseMemberWaitingForMemberLeft = pageOne.evaluate(
      async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForLayoutChangedDemotedInvisible = new Promise(
          (resolve, reject) => {
            roomObj.on('layout.changed', ({ layout }) => {
              for (const layer of layout.layers) {
                // console.log("Layer member ID:", layer.member_id, "Demoted member ID:", demoteMemberId, " Position:", layer.position)
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
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.left] Name is not "e2e_audience"'))
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
      { demoteMemberId: audienceId }
    )

    const [audienceRoomJoined, _] = await Promise.all([
      promiseAudienceRoomJoined,
      promiseMemberWaitingForMemberLeft,
    ])

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure member_id is the same after promote and demote on pageTwo ---------------
    await expectMemberId(pageTwo, audienceId) // before promote
    await expectMemberId(pageTwo, audienceRoomJoined.member_id) // after promote and demote process

    // --------------- Make sure on pageTwo he got back to audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience (audience again so recvonly) ---------------
    await expectSDPDirection(pageTwo, 'recvonly', true)
  })
})
