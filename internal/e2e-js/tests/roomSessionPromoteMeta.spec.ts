import { test, expect, Page } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { SERVER_URL, createTestRoomSession } from '../utils'

test.describe('RoomSession promote updating member meta', () => {
  test('should promote audience setting the meta field', async ({
    context,
  }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))
    pageTwo.on('console', (log) => console.log('[pageTwo]', log))

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

    const expectAudienceSDP = async (direction: string, value: boolean) => {
      const pageTwoSDP = await pageTwo.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        // @ts-expect-error
        return roomObj.peer.localSdp
      })

      expect(pageTwoSDP.split('m=')[1].includes(direction)).toBe(value)
      expect(pageTwoSDP.split('m=')[2].includes(direction)).toBe(value)
    }

    const expectInteractivityMode = async (
      page: Page,
      mode: 'member' | 'audience'
    ) => {
      const interactivityMode = await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.interactivityMode
      })

      expect(interactivityMode).toEqual(mode)
    }

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
    await expectAudienceSDP('recvonly', true)

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

    // ------- Promote audience from pageOne and resolve on `member.joined` and pageTwo room.joined ----
    const promiseAudienceRoomSubscribed = pageTwo.evaluate(() => {
      return new Promise((resolve, reject) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        roomObj.on('room.joined', ({ room_session }) => {
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
    await expectAudienceSDP('sendrecv', true)

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
