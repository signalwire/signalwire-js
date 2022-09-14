import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
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

    page.on('console', (log) => {
      console.log(log)
    })

    const roomName = 'e2e-room-one'
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
          'room.set_meta',
          'room.member.set_meta',
        ],
      },
      initialEvents: [
        'member.joined',
        'member.left',
        'member.updated',
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.started',
        'room.updated',
      ],
    })

    // --------------- Joining the room ---------------
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
    expect(
      joinParams.room.members.some(
        (member: any) => member.id === joinParams.member_id
      )
    ).toBeTruthy()
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await page.waitForSelector('div[id^="sw-sdk-"] > video', { timeout: 5000 })

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ joinParams }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === true
            ) {
              resolve(true)
            }
          })
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.audioMute()
        await roomObj.audioUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { joinParams }
    )

    // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ joinParams }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('video_muted') &&
              params.member.updated.includes('visible') &&
              params.member.video_muted === true &&
              params.member.visible === false
            ) {
              resolve(true)
            }
          })
        })

        const memberUpdatedUnnuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === joinParams.member_id &&
              params.member.updated.includes('video_muted') &&
              params.member.updated.includes('visible') &&
              params.member.video_muted === true &&
              params.member.visible === false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.videoMute()
        await roomObj.videoUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnnuted])
      },
      { joinParams }
    )

    // --------------- Session Recording ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const recordingStarted = new Promise((resolve, reject) => {
        roomObj.on('recording.started', (params) => {
          if (params.state === 'recording') {
            resolve(true)
          } else {
            reject(new Error('[recording.started] state is not "recording"'))
          }
        })
      })

      const roomUpdatedStarted = new Promise((resolve, reject) => {
        roomObj.on('room.updated', (params) => {
          if (
            params.room.recording === true &&
            // The type is incorrectly inferred within this
            // test. `params` is being inferred as
            // `VideoRoomEventParams` instead of
            // `RoomSessionUpdated`
            // @ts-expect-error
            params.room?.updated.includes('recording')
          ) {
            resolve(true)
          } else {
            reject(new Error('[room.updated] state is not "recording"'))
          }
        })
      })

      const recordingEnded = new Promise((resolve, reject) => {
        roomObj.on('recording.ended', (params) => {
          if (params.state === 'completed') {
            resolve(true)
          } else {
            reject(new Error('[recording.ended] state is not "completed"'))
          }
        })
      })

      const recObj = await roomObj.startRecording()

      await new Promise((r) => setTimeout(r, 1000))

      await recObj.stop()

      return Promise.all([recordingStarted, roomUpdatedStarted, recordingEnded])
    })

    // --------------- Playback ---------------
    await page.evaluate(
      async ({ PLAYBACK_URL }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const playbackStarted = new Promise((resolve, reject) => {
          roomObj.on('playback.started', (params) => {
            if (params.state === 'playing') {
              resolve(true)
            } else {
              reject(new Error('[playback.started] state is not "recording"'))
            }
          })
        })

        const playbackEnded = new Promise((resolve, reject) => {
          roomObj.on('playback.ended', (params) => {
            if (params.state === 'completed') {
              resolve(true)
            } else {
              reject(new Error('[playback.ended] state is not "completed"'))
            }
          })
        })

        let hasPaused = false
        const playbackPaused = new Promise((resolve) => {
          roomObj.on('playback.updated', (params) => {
            if (params.state === 'paused') {
              hasPaused = true
              resolve(true)
            }
          })
        })

        const playbackResume = new Promise((resolve) => {
          roomObj.on('playback.updated', (params) => {
            if (params.state === 'playing' && hasPaused) {
              resolve(true)
            }
          })
        })

        const playbackVolume = new Promise((resolve) => {
          roomObj.on('playback.updated', (params) => {
            if (params.volume === -50) {
              resolve(true)
            }
          })
        })

        const playbackObj = await roomObj.play({
          url: PLAYBACK_URL!,
        })

        await playbackObj.setVolume(-50)
        await playbackObj.pause()
        await playbackObj.resume()
        await playbackObj.stop()

        return Promise.all([
          playbackStarted,
          playbackVolume,
          playbackEnded,
          playbackPaused,
          playbackResume,
        ])
      },
      { PLAYBACK_URL: process.env.PLAYBACK_URL }
    )

    // --------------- Screenshare ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      let screenMemberId: string
      const screenJoined = new Promise((resolve) => {
        roomObj.on('member.joined', (params: any) => {
          if (params.member.type === 'screen') {
            screenMemberId = params.member.id
            resolve(true)
          }
        })
      })

      const screenLeft = new Promise((resolve) => {
        roomObj.on('member.left', (params) => {
          if (
            params.member.type === 'screen' &&
            params.member.id === screenMemberId
          ) {
            resolve(true)
          }
        })
      })

      const screenShareObj = await roomObj.startScreenShare({
        audio: true,
        video: true,
      })

      const screenRoomLeft = new Promise((resolve) => {
        screenShareObj.on('room.left', () => resolve(true))
      })

      await new Promise((r) => setTimeout(r, 2000))

      await screenShareObj.leave()

      return Promise.all([screenJoined, screenLeft, screenRoomLeft])
    })

    const expectRoomMeta = async (expected: any) => {
      // --------------- Get Room Meta ---------------
      const currentMeta: any = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.getMeta()
      })
      expect(currentMeta.meta).toStrictEqual(expected)
    }

    await expectRoomMeta({})

    // --------------- Set Room Meta ---------------
    const meta = { something: 'xx-yy-zzz' }
    const resultMeta = await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const setRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.setMeta(meta)

        return setRoomMeta
      },
      {
        meta,
      }
    )
    expect(meta).toStrictEqual(resultMeta)

    await expectRoomMeta(resultMeta)

    // --------------- Update Room Meta ---------------
    const metaUpdate = { updatedKey: 'ii-oo' }
    const resultMetaUpdate = await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const setRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.updateMeta(meta)

        return setRoomMeta
      },
      {
        meta: metaUpdate,
      }
    )
    // Updates should be partial. In this case we're testing
    // that on top of having the newly added key via
    // `updateMeta` we also have the keys set via `setMeta`
    // (previous step) untouched.
    expect({
      ...meta,
      ...metaUpdate,
    }).toStrictEqual(resultMetaUpdate)

    await expectRoomMeta(resultMetaUpdate)

    // --------------- Delete Room Meta ---------------
    const metaDelete = ['updatedKey']
    const resultMetaDelete = await page.evaluate(
      async ({ keys }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const deleteRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.deleteMeta(keys)

        return deleteRoomMeta
      },
      {
        keys: metaDelete,
      }
    )
    // Deletions should be partial. In this case we're
    // checking that we are only deleting the key added on
    // the "update" step and other keys remain untouched.
    expect(meta).toStrictEqual(resultMetaDelete)

    await expectRoomMeta(resultMetaDelete)

    // --------------------------

    const expectRoomMemberMeta = async (expected: any) => {
      // --------------- Get Room Meta ---------------
      const initialMeta: any = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.getMemberMeta()
      })
      expect(initialMeta.meta).toStrictEqual(expected)
    }

    expectRoomMemberMeta({})

    // --------------- Set Member Meta ---------------
    const memberMeta = { memMeta: 'xx-yy-zzz' }
    const resultMemberMeta = await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const setMemberMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.setMemberMeta({ meta })

        return setMemberMeta
      },
      {
        meta: memberMeta,
      }
    )
    expect(memberMeta).toStrictEqual(resultMemberMeta)

    expectRoomMemberMeta(resultMemberMeta)

    // --------------- Update Member Meta ---------------
    const memberMetaUpdate = { updatedMemberKey: 'ii-oo' }
    const resultMemberMetaUpdate = await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const updateMemberMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.updateMemberMeta({ meta })

        return updateMemberMeta
      },
      {
        meta: memberMetaUpdate,
      }
    )
    // Updates should be partial. In this case we're testing
    // that on top of having the newly added key via
    // `updateMeta` we also have the keys set via `setMeta`
    // (previous step) untouched.
    expect({
      ...memberMeta,
      ...memberMetaUpdate,
    }).toStrictEqual(resultMemberMetaUpdate)

    expectRoomMemberMeta(resultMemberMetaUpdate)

    // --------------- Delete Room Meta ---------------
    const memberMetaDelete = ['updatedMemberKey']
    const resultMemberMetaDelete = await page.evaluate(
      async ({ keys }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const deleteMemberRoomMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.deleteMemberMeta({ keys })

        return deleteMemberRoomMeta
      },
      {
        keys: memberMetaDelete,
      }
    )
    // Deletions should be partial. In this case we're
    // checking that we are only deleting the key added on
    // the "update" step and other keys remain untouched.
    expect(memberMeta).toStrictEqual(resultMemberMetaDelete)

    expectRoomMemberMeta(resultMemberMetaDelete)
    // --------------------------

    // --------------- Leaving the room ---------------
    await page.evaluate(() => {
      // @ts-expect-error
      return window._roomObj.leave()
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

  test(`should allow retrieving the room session recordings and playbacks`, async ({
    context,
  }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

    pageOne.on('console', (log) => {
      console.log('[pageOne]', log)
    })
    pageTwo.on('console', (log) => {
      console.log('[pageTwo]', log)
    })

    await Promise.all([pageOne.goto(server.url), pageTwo.goto(server.url)])

    const roomName = 'e2e-room-two'
    const connectionSettings = {
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
      initialEvents: [
        'member.joined',
        'member.left',
        'member.updated',
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.started',
        'room.updated',
      ],
    }

    await Promise.all([
      createTestRoomSession(pageOne, connectionSettings),
      createTestRoomSession(pageTwo, connectionSettings),
    ])

    // --------------- Joining the 1st room ---------------
    await pageOne.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    // Checks that the video is visible
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Start recording and playback from 1st room ---------------
    await pageOne.evaluate(
      async ({ PLAYBACK_URL }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const recordingStarted = new Promise((resolve, reject) => {
          roomObj.on('recording.started', (params) => {
            if (params.state === 'recording') {
              resolve(true)
            } else {
              reject(new Error('[recording.started] state is not "recording"'))
            }
          })
        })

        const playbackStarted = new Promise((resolve, reject) => {
          roomObj.on('playback.started', (params) => {
            if (params.state === 'playing') {
              resolve(true)
            } else {
              reject(new Error('[playback.started] state is not "recording"'))
            }
          })
        })

        await roomObj.startRecording()
        await roomObj.play({
          url: PLAYBACK_URL!,
        })

        // setTimeout(() => {
        //   playbackObj.stop()
        // }, 2000)

        return Promise.all([recordingStarted, playbackStarted])
      },
      { PLAYBACK_URL: process.env.PLAYBACK_URL }
    )

    // --------------- Joining the 2nd room ---------------
    await pageTwo.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    // Checks that the video is visible
    await pageTwo.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Getting the recordings from the 2nd room ---------------
    const recordings: any = await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const payload = await roomObj.getRecordings()

      return Promise.all(
        payload.recordings.map((recording: any) => {
          const recordingEnded = new Promise((resolve) => {
            roomObj.on('recording.ended', (params) => {
              if (params.id === recording.id) {
                resolve(params)
              }
            })
          })

          recording.stop().then(() => {
            console.log(`Recording ${recording.id} stopped!`)
          })

          return recordingEnded
        })
      )
    })

    recordings.forEach((recording: any) => {
      // Since functions can't be serialized back to this
      // thread (from the previous step) we just check that
      // the property is there.
      expect('pause' in recording).toBeTruthy()
      expect('resume' in recording).toBeTruthy()
      expect('stop' in recording).toBeTruthy()
      expect(recording.id).toBeDefined()
      expect(recording.roomSessionId).toBeDefined()
      expect(recording.state).toBeDefined()
    })

    // --------------- Getting the playbacks from the 2nd room ---------------
    const playbacks = await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const payload = await roomObj.getPlaybacks()

      return Promise.all(
        payload.playbacks.map((playback) => {
          const playbackEnded = new Promise((resolve) => {
            roomObj.on('playback.ended', (params) => {
              if (params.id === playback.id) {
                resolve(params)
              }
            })
          })

          new Promise((r) => setTimeout(r, 100)).then(() => {
            playback.stop().then(() => {
              console.log(`Playback ${playback.id} ended!`)
            })
          })

          return playbackEnded
        })
      ) as any as Video.RoomSessionPlayback[]
    })

    playbacks.forEach((playback) => {
      // Since functions can't be serialized back to this
      // thread (from the previous step) we just check that
      // the property is there.
      expect('forward' in playback).toBeTruthy()
      expect('pause' in playback).toBeTruthy()
      expect('resume' in playback).toBeTruthy()
      expect('rewind' in playback).toBeTruthy()
      expect('seek' in playback).toBeTruthy()
      expect('setVolume' in playback).toBeTruthy()
      expect('stop' in playback).toBeTruthy()
      expect(playback.id).toBeDefined()
      expect(playback.roomSessionId).toBeDefined()
      // expect(playback.last_position).toBeDefined()
      expect(playback.seekable).toBeDefined()
      expect(playback.startedAt).toBeDefined()
      expect(playback.state).toBeDefined()
      expect(playback.url).toBeDefined()
      expect(playback.volume).toBeDefined()
    })

    await new Promise((r) => setTimeout(r, 1000))

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      pageOne.evaluate(() => {
        // @ts-expect-error
        return window._roomObj.leave()
      }),
      pageTwo.evaluate(() => {
        // @ts-expect-error
        return window._roomObj.leave()
      }),
    ])
  })
})
