import { test, expect, Page } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession promote method', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should not be able to promote participant', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))
    pageTwo.on('console', (log) => console.log('[pageTwo]', log))

    await Promise.all([pageOne.goto(server.url), pageTwo.goto(server.url)])

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

    // --------------- Check that the audience member on pageTwo is receiving non-silence ---------------
    async function getAudioStats() {
      const audioStats = await pageTwo.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        // @ts-expect-error
        const stats = await roomObj.peer.instance.getStats(null)

        const filter = {
          'inbound-rtp': [
            'audioLevel',
            'totalAudioEnergy',
            'totalSamplesDuration',
          ],
        }
        let result = {}
        Object.keys(filter).forEach((entry) => {
          result[entry] = {}
        })

        stats.forEach((report) => {
          for (const [key, value] of Object.entries(filter)) {
            //console.log(key, value, report.type)
            if (report.type == key) {
              value.forEach((entry) => {
                //console.log(key, entry, report[entry])
                if (report[entry]) {
                  result[key][entry] = report[entry]
                }
              })
            }
          }
        }, {})
        return result
      })
      return audioStats
    }

    await pageOne.waitForTimeout(2000)
    let audioLevelStats: any = await getAudioStats()
    console.log('audience audioLevelStats 1', audioLevelStats)
    expect(audioLevelStats['inbound-rtp']['totalAudioEnergy']).toBeGreaterThan(
      0.1
    )
    await pageOne.waitForTimeout(5000)
    audioLevelStats = await getAudioStats()
    console.log('audience audioLevelStats 2', audioLevelStats)
    expect(audioLevelStats['inbound-rtp']['totalAudioEnergy']).toBeGreaterThan(
      0.5
    )

    // --------------- Promote participant from pageOne and resolve on error ---------------
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      return new Promise((resolve, reject) => {
        roomObj
          .promote({
            memberId: roomObj.memberId,
            permissions: ['room.member.promote', 'room.member.demote'],
          })
          .then(() => {
            reject(new Error('Should not be able to promote participant'))
          })
          .catch((e) => {
            console.log('promote error', e)
            return resolve(true)
          })
      })

      // return waitForMemberJoined
    })

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      // @ts-expect-error
      pageOne.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageTwo.evaluate(() => window._roomObj.leave()),
    ])
  })
})
