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
  expectPageReceiveAudio,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSession promote/demote methods', () => {
  test('should promote/demote audience', async ({ createCustomPage }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const roomName = randomizeRoomName()

    const memberSettings = {
      vrt: {
        room_name: roomName,
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
        room_name: roomName,
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
      roomSessionOptions: {
        reattach: true, // FIXME: to remove
      },
    }

    await Promise.all([
      createTestRoomSession(pageOne, memberSettings),
      createTestRoomSession(pageTwo, audienceSettings),
    ])

    await expectRoomJoined(pageOne)
    await expectMCUVisible(pageOne)

    const pageTwoRoomJoined = await expectRoomJoined(pageTwo)
    const pageTwoMemberId = pageTwoRoomJoined.member_id
    await expectMCUVisibleForAudience(pageTwo)
    await expectPageReceiveAudio(pageTwo)

    const layoutName = '3x3'
    const layoutChangedPageOne = expectLayoutChanged(pageOne, layoutName)
    const layoutChangedPageTwo = expectLayoutChanged(pageTwo, layoutName)
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
      { promoteMemberId: pageTwoMemberId }
    )

    await pageTwo.waitForTimeout(1000)

    await expectMemberId(pageTwo, pageTwoMemberId)
    await expectInteractivityMode(pageTwo, 'member')
    await expectSDPDirection(pageTwo, 'sendrecv', true)
    const pageTwoPromotedCallId = await pageTwo.evaluate(() => {
      // @ts-expect-error
      return window._roomObj.callId
    })
    // Promotion done.

    await pageTwo.waitForTimeout(1000)

    // Reattach now
    await pageTwo.reload()

    // pageTwo reattaches as member, since it was promoted
    const promotedSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_audience',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: [
        'member.joined',
        'member.updated',
        'member.left',
        'layout.changed'
      ],
      roomSessionOptions: {
        reattach: true, // FIXME: to remove
      },
    }

    await createTestRoomSession(pageTwo, promotedSettings)

    console.time('reattach')
    const reattachParams: any = await expectRoomJoined(pageTwo)
    console.timeEnd('reattach')

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(
      reattachParams.room.members.some(
        (member: any) => member.id === reattachParams.member_id
      )
    ).toBeTruthy()
    expect(reattachParams.room_session.name).toBe(roomName)
    expect(reattachParams.room.name).toBe(roomName)
    // Make sure the member_id is stable
    expect(reattachParams.member_id).toBeDefined()
    expect(reattachParams.member_id).toBe(pageTwoMemberId)
    // Also call_id must remain the same
    expect(reattachParams.call_id).toBeDefined()
    expect(reattachParams.call_id).toBe(pageTwoPromotedCallId)
    await expectMCUVisible(pageTwo)
// Reattach done

    // Demote to audience again from pageOne
    // and resolve on `member.left`
    // and `layout.changed` with position off-canvas

    const promiseAudienceRoomJoined = expectRoomJoined(pageTwo, {
      invokeJoin: false,
    })

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
      { demoteMemberId: pageTwoMemberId }
    )

    const [audienceRoomJoined, _] = await Promise.all([
      promiseAudienceRoomJoined,
      promiseMemberWaitingForMemberLeft,
    ])

    await pageTwo.waitForTimeout(2000)

    await expectMemberId(pageTwo, pageTwoMemberId) // before promote
    await expectMemberId(pageTwo, audienceRoomJoined.member_id) // after promote and demote process
    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)
  })
})
