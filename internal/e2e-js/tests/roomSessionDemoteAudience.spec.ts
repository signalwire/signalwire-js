import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
} from '../utils'

test.describe('RoomSession demote method', () => {
  test('should not be able to to demote audience', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

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
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // --------------- Make sure on pageOne we have a member ---------------
    await expectInteractivityMode(pageOne, 'member')

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined: any = await pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.once('room.joined', resolve)
        roomObj.join()
      })
    })

    // --------------- Make sure on pageTwo we have a audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly since audience) ---------------
    await expectSDPDirection(pageTwo, 'recvonly', true)

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

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

        console.log('demote error', error.jsonrpc.code, error.jsonrpc.message)
        return error.jsonrpc.code
      },
      { demoteMemberId: pageTwoRoomJoined.member_id }
    )
    expect(errorCode).toBe('404')

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure on pageTwo still have audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience still have recvonly ---------------
    await expectSDPDirection(pageTwo, 'recvonly', true)

    await pageTwo.waitForTimeout(2000)

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      // @ts-expect-error
      pageOne.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageTwo.evaluate(() => window._roomObj.leave()),
    ])
  })
})
