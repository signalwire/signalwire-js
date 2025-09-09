import { test, expect } from '../fixtures'
import type { Video, VideoRoomSession } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  setLayoutOnPage,
  expectLayoutChanged,
  expectMCUVisible,
  expectRoomJoinWithDefaults,
} from '../utils'

test.describe('RoomSession', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('join-leave-e2e')
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
    ]
    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions,
      },
      initialEvents: [
        'layout.changed',
        'member.joined',
        'member.left',
        'member.updated',
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.updated',
        'recording.started',
        'room.updated',
      ],
    })

    // --------------- Joining the room ---------------
    const joinParams =
      await test.step('it should join a room and assert room props', async () => {
        const roomParams = await expectRoomJoinWithDefaults(page)

        expect(roomParams.room).toBeDefined()
        expect(roomParams.room_session).toBeDefined()
        expect(
          roomParams.room.members.some(
            (member: any) => member.id === roomParams.member_id
          )
        ).toBeTruthy()
        expect(roomParams.room_session.name).toBe(roomName)
        expect(roomParams.room.name).toBe(roomName)

        return roomParams
      })

    // Checks that the video is visible
    await test.step('it should expect the MCU to be visible', async () => {
      await expectMCUVisible(page)
    })

    const roomPermissions = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: VideoRoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(permissions)

    // --------------- Muting Audio (self) ---------------
    await test.step('it should mute and unmute audio (self)', async () => {
      await page.evaluate(
        async ({ joinParams }) => {
          // @ts-expect-error
          const roomObj: VideoRoomSession = window._roomObj

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
    })

    // --------------- Muting Video (self) ---------------
    await test.step('it should mute and unmute video (self)', async () => {
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
    })

    // --------------- Session Recording ---------------
    await test.step('it should handle recording start, pause, resume and stop', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: VideoRoomSession = window._roomObj

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

        let recordingPaused = false
        const roomUpdatedPaused = new Promise((resolve, reject) => {
          roomObj.on('recording.updated', (params) => {
            if (params.state === 'paused' && recordingPaused === false) {
              recordingPaused = true
              resolve(true)
            } else {
              reject(new Error('[recording.updated] state is not "paused"'))
            }
          })
        })

        const roomUpdatedResumed = new Promise((resolve, reject) => {
          roomObj.on('recording.updated', (params) => {
            if (params.state === 'recording' && recordingPaused === true) {
              resolve(true)
            } else if (params.state === 'paused' && recordingPaused === true) {
              console.log(
                '[recording.updated] Still waiting for recording to resume...'
              )
            } else {
              reject(
                new Error(
                  '[recording.updated] state is not "paused" or "recording"'
                )
              )
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
        await recObj.pause()
        await new Promise((r) => setTimeout(r, 1000))
        await recObj.resume()
        await new Promise((r) => setTimeout(r, 1000))
        await recObj.stop()

        return Promise.all([
          recordingStarted,
          roomUpdatedStarted,
          roomUpdatedPaused,
          roomUpdatedResumed,
          recordingEnded,
        ])
      })
    })

    // --------------- Playback ---------------
    await test.step('it should handle playback start, volume change, pause, resume and stop', async () => {
      await page.evaluate(
        async ({ PLAYBACK_URL }) => {
          // @ts-expect-error
          const roomObj: VideoRoomSession = window._roomObj

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
    })

    // --------------- Screenshare ---------------
    await test.step('it should handle start and stop of a screenshare', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: VideoRoomSession = window._roomObj

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

        const screenShareIdCheckPromise = new Promise((resolve) => {
          resolve(screenMemberId === screenShareObj.memberId)
        })

        const screenRoomLeft = new Promise((resolve) => {
          screenShareObj.on('room.left', () => resolve(true))
        })

        await new Promise((r) => setTimeout(r, 2000))

        await screenShareObj.leave()

        return Promise.all([
          screenJoined,
          screenLeft,
          screenRoomLeft,
          screenShareIdCheckPromise,
        ])
      })
    })

    await test.step('it should handle setting, updating and deleting room meta', async () => {
      const expectRoomMeta = async (expected: any) => {
        // --------------- Get Room Meta ---------------
        const currentMeta: any = await page.evaluate(() => {
          // @ts-expect-error
          const roomObj: VideoRoomSession = window._roomObj
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
          const roomObj: VideoRoomSession = window._roomObj

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
          const roomObj: VideoRoomSession = window._roomObj

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
          const roomObj: VideoRoomSession = window._roomObj

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
    })

    await test.step('it should handle setting, updating and deleting member meta', async () => {
      const expectRoomMemberMeta = async (expected: any) => {
        // --------------- Get Room Meta ---------------
        const initialMeta: any = await page.evaluate(() => {
          // @ts-expect-error
          const roomObj: VideoRoomSession = window._roomObj
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
          const roomObj: VideoRoomSession = window._roomObj

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
          const roomObj: VideoRoomSession = window._roomObj

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
          const roomObj: VideoRoomSession = window._roomObj

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
    })

    await test.step('it should set the room layout', async () => {
      const layoutName = '3x3'
      // --------------- Expect layout to change ---------------
      const layoutChangedPromise = expectLayoutChanged(page, layoutName)
      // --------------- Set layout ---------------
      await setLayoutOnPage(page, layoutName)
      expect(await layoutChangedPromise).toBe(true)
    })
  })

  test('should allow retrieving the room session recordings and playbacks', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const roomName = 'e2e-room-two'
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.recording', 'room.playback_seek', 'room.playback'],
      },
      initialEvents: [
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.started',
        'room.updated',
      ],
      expectToJoin: false,
    }

    await Promise.all([
      createTestRoomSession(pageOne, connectionSettings),
      createTestRoomSession(pageTwo, connectionSettings),
    ])

    // --------------- Joining the 1st room ---------------
    await expectRoomJoinWithDefaults(pageOne)

    // Checks that the video is visible
    await expectMCUVisible(pageOne)

    // --------------- Start recording and playback from 1st room ---------------
    await pageOne.evaluate(
      async ({ playbackURL }) => {
        // @ts-expect-error
        const roomObj: VideoRoomSession = window._roomObj

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
        await roomObj.play({ url: playbackURL! })

        return Promise.all([recordingStarted, playbackStarted])
      },
      { playbackURL: process.env.PLAYBACK_URL }
    )

    // --------------- Joining the 2nd room ---------------
    await expectRoomJoinWithDefaults(pageTwo)

    // Checks that the video is visible
    await expectMCUVisible(pageTwo)

    // --------------- Getting the recordings from the 2nd room ---------------
    const recordings: any = await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const roomObj: VideoRoomSession = window._roomObj
      const payload = await roomObj.getRecordings()

      return Promise.all(
        payload.recordings.map((recording: any) => {
          const recordingEnded = new Promise((resolve) => {
            roomObj.on('recording.ended', (params) => {
              if (params.id === recording.id) {
                const paramWithGetters = {
                  id: params.id,
                  roomSessionId: params.roomSessionId,
                  state: params.state,
                  pause: params.pause,
                  resume: params.resume,
                  stop: params.stop,
                }
                resolve(paramWithGetters)
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
      const roomObj: VideoRoomSession = window._roomObj
      const payload = await roomObj.getPlaybacks()

      return Promise.all(
        payload.playbacks.map((playback) => {
          const playbackEnded = new Promise((resolve) => {
            roomObj.on('playback.ended', (params) => {
              if (params.id === playback.id) {
                const paramWithGetters = {
                  id: params.id,
                  roomSessionId: params.roomSessionId,
                  state: params.state,
                  seekable: params.seekable,
                  startedAt: params.startedAt,
                  url: params.url,
                  volume: params.volume,
                  forward: params.forward,
                  pause: params.pause,
                  resume: params.resume,
                  rewind: params.rewind,
                  seek: params.seek,
                  setVolume: params.setVolume,
                  stop: params.stop,
                }
                resolve(paramWithGetters)
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
  })
})
