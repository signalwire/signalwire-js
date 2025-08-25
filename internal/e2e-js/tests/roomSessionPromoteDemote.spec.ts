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
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectPageReceiveAudio,
  randomizeRoomName,
  expectRoomJoinWithDefaults,
  expectPageEvalToPass,
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
    }

    await Promise.all([
      createTestRoomSession(pageOne, memberSettings),
      createTestRoomSession(pageTwo, audienceSettings),
    ])

    await expectRoomJoinWithDefaults(pageOne)
    await expectMCUVisible(pageOne)

    const pageTwoRoomJoined = await expectRoomJoinWithDefaults(pageTwo, {
      joinAs: 'audience',
    })
    const audienceId = pageTwoRoomJoined.member_id
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

    const promisePromotedRoomJoined = expectRoomJoinWithDefaults(pageTwo, {
      invokeJoin: false,
      joinAs: 'member',
    })

    // -------- Promote audience from pageOne and resolve on `member.joined` ------
    const memberJoinedEventPromise = expectPageEvalToPass(pageOne, {
      evaluateFn: () =>
        new Promise((resolve, reject) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('member.joined', ({ member }) => {
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.joined] Name is not "e2e_audience"'))
            }
          })
        }),
      messageAssert: 'member.joined event is recived',
      messageError: 'member.joined event is not recived',
    })

    await expectPageEvalToPass(pageOne, {
      evaluateArgs: { promoteMemberId: audienceId },
      evaluateFn: ({ promoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
        })
      },
      messageAssert: 'audience is promoted',
      messageError: 'audience is not promoted',
    })

    await Promise.all([promisePromotedRoomJoined, memberJoinedEventPromise])

    // Promotion done.
    await pageTwo.waitForTimeout(2000)

    // -------- Demote to audience from pageOne and resolve on `member.left` and `layout.changed` with position off-canvas ------
    const demotedMemberJoinedEventPromise = expectRoomJoinWithDefaults(
      pageTwo,
      {
        invokeJoin: false,
        joinAs: 'audience',
      }
    )

    const layoutChangedEventPromise = expectPageEvalToPass(pageOne, {
      evaluateArgs: { demoteMemberId: audienceId },
      evaluateFn: ({ demoteMemberId }) => {
        return new Promise((resolve, reject) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('layout.changed', ({ layout }) => {
            for (const layer of layout.layers) {
              if (
                layer.member_id === demoteMemberId &&
                layer.visible === true
              ) {
                reject(
                  new Error('[layout.changed] Demoted member is still visible')
                )
              }
            }
            resolve(true)
          })
        })
      },
      messageAssert: 'layout.changed event is received',
      messageError: 'layout.changed event is not received',
    })

    const memberLeftEventPromise = expectPageEvalToPass(pageOne, {
      evaluateFn: () => {
        return new Promise((resolve, reject) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('member.left', ({ member }) => {
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.left] Name is not "e2e_audience"'))
            }
          })
        })
      },
      messageAssert: 'member.left event is received',
      messageError: 'member.left event is not received',
    })

    await expectPageEvalToPass(pageOne, {
      evaluateArgs: { demoteMemberId: audienceId },
      evaluateFn: async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        await roomObj.demote({
          memberId: demoteMemberId,
        })
      },
      messageAssert: 'member is demoted',
      messageError: 'member is not demoted',
    })

    const [audienceRoomJoined] = await Promise.all([
      demotedMemberJoinedEventPromise,
      layoutChangedEventPromise,
      memberLeftEventPromise,
    ])

    await pageTwo.waitForTimeout(2000)

    await expectMemberId(pageTwo, audienceId) // before promote
    await expectMemberId(pageTwo, audienceRoomJoined.member_id) // after promote and demote process
    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)
  })
})
