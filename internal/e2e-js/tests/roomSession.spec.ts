import { test, expect } from '@playwright/test'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should handle joining a room, perform actions and then leave the room', async ({
    page,
  }) => {
    await page.goto(server.url)

    const roomName = 'another'
    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: [
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
          'room.playback.seek',
          'room.playback',
        ],
      },
    })

    // Joining the room
    const joinParams: any = await page.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.members.length).toBe(1)
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await page.waitForSelector('div[id^="sw-sdk-"] > video', { timeout: 5000 })

    // Muting Audio (self)
    await page.evaluate(
      ({ joinParams }) => {
        // @ts-expect-error
        const roomObj = window._roomObj

        const memberUpdatedAudioMuted = new Promise((resolve, reject) => {
          roomObj.on('member.updated.audio_muted', (params: any) => {
            if (params.member.id === joinParams.member_id) {
              resolve(true)
            } else {
              reject()
            }
          })
        })

        const memberUpdated = new Promise((resolve, reject) => {
          roomObj.on('member.updated', (params: any) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === true
            ) {
              resolve(true)
            } else {
              reject()
            }
          })
        })

        queueMicrotask(() => roomObj.audioMute())

        return Promise.all([memberUpdatedAudioMuted, memberUpdated])
      },
      { joinParams }
    )

    // Muting Video (self)
    await page.evaluate(
      ({ joinParams }) => {
        // @ts-expect-error
        const roomObj = window._roomObj

        const memberUpdatedVideoMuted = new Promise((resolve, reject) => {
          roomObj.on('member.updated.video_muted', (params: any) => {
            if (params.member.id === joinParams.member_id) {
              resolve(true)
            } else {
              reject()
            }
          })
        })

        const memberUpdated = new Promise((resolve, reject) => {
          roomObj.on('member.updated', (params: any) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('video_muted') &&
              params.member.updated.includes('visible') &&
              params.member.video_muted === true &&
              params.member.visible === false
            ) {
              resolve(true)
            } else {
              reject()
            }
          })
        })

        queueMicrotask(() => roomObj.videoMute())

        return Promise.all([memberUpdatedVideoMuted, memberUpdated])
      },
      { joinParams }
    )

    // Session Recording
    // await page.evaluate(async () => {
    //   // @ts-expect-error
    //   const roomObj = window._roomObj

    //   const recordingStarted = new Promise((resolve, reject) => {
    //     roomObj.on('recording.started', (params: any) => {
    //       if (params.state === 'recording') {
    //         resolve(true)
    //       } else {
    //         reject()
    //       }
    //     })
    //   })

    //   const roomUpdatedStarted = new Promise((resolve, reject) => {
    //     roomObj.on('room.updated', (params: any) => {
    //       if (
    //         params.room.recording === true &&
    //         params.room.updated.includes['recording']
    //       ) {
    //         resolve(true)
    //       } else {
    //         reject()
    //       }
    //     })
    //   })

    //   const recordingEnded = new Promise((resolve, reject) => {
    //     roomObj.on('recording.ended', (params: any) => {
    //       if (params.state === 'completed') {
    //         resolve(true)
    //       } else {
    //         reject()
    //       }
    //     })
    //   })

    //   const roomUpdatedEnded = new Promise((resolve, reject) => {
    //     roomObj.on('room.updated', (params: any) => {
    //       if (
    //         params.room.recording === false &&
    //         params.room.updated.includes['recording']
    //       ) {
    //         resolve(true)
    //       } else {
    //         reject()
    //       }
    //     })
    //   })

    //   let recObj: any
    //   setTimeout(() => {
    //     roomObj
    //       .startRecording()
    //       .then((obj: any) => {
    //         recObj = obj
    //       })
    //       .catch(() => {
    //         throw new Error("Couldn't start recording")
    //       })
    //   }, 500)

    //   await new Promise((r) => setTimeout(r, 1000))

    //   queueMicrotask(() => recObj.stop())

    //   return Promise.all([
    //     recordingStarted,
    //     roomUpdatedStarted,
    //     recordingEnded,
    //     roomUpdatedEnded,
    //   ])
    // })

    // Leaving the room
    await page.evaluate(() => {
      // @ts-expect-error
      return window._roomObj.hangup()
    })

    // Checks that all the elements added by the SDK are gone.
    const targetElementsCount = await page.evaluate(() => {
      return {
        videos: Array.from(document.querySelectorAll('video')).length,
        rootEl: document.getElementById('rootElement')!.childElementCount,
      }
    })
    expect(targetElementsCount.videos).toBe(0)
    expect(targetElementsCount.rootEl).toBe(0)
  })
})
