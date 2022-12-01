import { test, expect } from '@playwright/test'
import {
  SERVER_URL,
  createTestRoomSession,
  enablePageLogs,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSession Audience Count', () => {
  test('should receive correct audience_count in events', async ({
    context,
  }) => {
    const allPages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ])
    const [pageOne, pageTwo, pageThree, pageFour, pageFive] = allPages
    const audiencePages = [pageTwo, pageThree, pageFour, pageFive]
    await Promise.all(allPages.map((page) => page.goto(SERVER_URL)))
    enablePageLogs(pageOne, '[pageOne]')
    //enablePageLogs(pageTwo, '[pageTwo]')

    const room_name = randomizeRoomName()
    const permissions = [
      'room.self.audio_mute',
      'room.self.audio_unmute',
      'room.self.video_mute',
      'room.self.video_unmute',
      'room.member.audio_mute',
      'room.member.video_mute',
      'room.member.set_input_volume',
      'room.member.set_output_volume',
      'room.member.set_input_sensitivity',
      'room.member.remove',
      'room.set_layout',
      'room.list_available_layouts',
      'room.recording',
      'room.hide_video_muted',
      'room.show_video_muted',
      'room.playback_seek',
      'room.playback',
      'room.set_meta',
      'room.member.set_meta',
      'room.memberCount',
    ]

    const memberInitialEvents = [
      'member.joined',
      'member.left',
      'member.updated',
      'playback.ended',
      'playback.started',
      'playback.updated',
      'recording.ended',
      'recording.started',
      'room.updated',
      'room.audience_count',
    ]

    await createTestRoomSession(pageOne, {
      vrt: {
        room_name,
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions,
        join_as: 'member',
      },
      initialEvents: memberInitialEvents,
    })

    const audienceInitialEvents = [
      'member.joined',
      'member.updated',
      'member.left',
    ]
    await Promise.all(
      audiencePages.map((page, i) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name,
            user_name: `e2e_audience_${i + 1}`,
            join_as: 'audience',
            permissions: [],
          },
          initialEvents: audienceInitialEvents,
        })
      })
    )
    // --------------- Joining the room and resolve on room.audienceCount ---------------
    const joinPromiseOne = pageOne.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        // Need to keep lastAudienceCounter on window in here
        // we don't have access to parent scope since this closure is ran
        // inside page context.
        // @ts-expect-error
        window.__audienceCount = 0
        roomObj.on('room.audienceCount', (params: any) => {
          console.log('HERE', params)
          // @ts-expect-error
          window.__audienceCount = params.total
          //@ts-expect-error
          if (window.__audienceCount == 1) {
            console.log('RESOLVING')
            r(params)
          }
        })
        roomObj.join()
      })
    })

    // join as audience on pageTwo and resolve on `room.joined`
    const joinTwoParams: any = await pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    expect(joinTwoParams.room_session.audience_count).toBe(1)

    await joinPromiseOne

    const getAudienceCounterFromPageOne = () => {
      return pageOne.evaluate(() => {
        // @ts-expect-error
        return window.__audienceCount
      })
    }

    let tabOneAudienceCounter = await getAudienceCounterFromPageOne()

    expect(tabOneAudienceCounter).toBe(1)
    const [_, ...pageThreeToFive] = audiencePages
    // join as audiences on pageThree to pageFive and resolve on `room.joined`
    await Promise.all(
      pageThreeToFive.map((page) => {
        return page.evaluate(() => {
          return new Promise((resolve) => {
            // @ts-expect-error
            const roomObj = window._roomObj
            roomObj.on('room.joined', resolve)
            roomObj.join()
          })
        })
      })
    )

    await pageOne.waitForTimeout(30000)

    tabOneAudienceCounter = await getAudienceCounterFromPageOne()
    expect(tabOneAudienceCounter).toBe(4)

    // --------------- Leaving the room ---------------
    await Promise.all(
      allPages.map((page) => {
        return page.evaluate(() => {
          // @ts-expect-error
          return window._roomObj.leave()
        })
      })
    )
  })
})
