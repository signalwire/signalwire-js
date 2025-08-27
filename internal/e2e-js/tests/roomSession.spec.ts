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
  expectPageEvalToPass,
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
    const joinParams = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(
      joinParams.room.members.some(
        (member: any) => member.id === joinParams.member_id
      )
    ).toBeTruthy()
    expect(joinParams.room_session.name).toBe(roomName)
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await expectMCUVisible(page)

    const roomPermissions = await expectPageEvalToPass(page, {
      evaluateFn: () => {
        const roomObj = window._roomObj as VideoRoomSession
        return roomObj.permissions
      },
      assertionFn: (perms) => expect(perms).toBeDefined(),
      message: 'Expected room permissions to be available',
    })
    expect(roomPermissions).toStrictEqual(permissions)

    // --------------- Muting Audio (self) ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { joinParams },
      evaluateFn: async ({ joinParams }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
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
          roomObj.on('member.updated', (params: any) => {
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
      assertionFn: (res) => expect(res).toHaveLength(2),
      message: 'Expected audio mute/unmute member.updated events',
    })

    // --------------- Muting Video (self) ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { joinParams },
      evaluateFn: async ({ joinParams }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
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
          roomObj.on('member.updated', (params: any) => {
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
      assertionFn: (res) => expect(res).toHaveLength(2),
      message: 'Expected video mute/unmute member.updated events',
    })

    // --------------- Session Recording ---------------
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const roomObj = window._roomObj as VideoRoomSession

        const recordingStarted = new Promise((resolve, reject) => {
          roomObj.on('recording.started', (params: any) => {
            if (params.state === 'recording') {
              resolve(true)
            } else {
              reject(new Error('[recording.started] state is not "recording"'))
            }
          })
        })

        const roomUpdatedStarted = new Promise((resolve, reject) => {
          roomObj.on('room.updated', (params: any) => {
            if (
              params.room.recording === true &&
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
          roomObj.on('recording.updated', (params: any) => {
            if (params.state === 'paused' && recordingPaused === false) {
              recordingPaused = true
              resolve(true)
            } else {
              reject(new Error('[recording.updated] state is not "paused"'))
            }
          })
        })

        const roomUpdatedResumed = new Promise((resolve, reject) => {
          roomObj.on('recording.updated', (params: any) => {
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
          roomObj.on('recording.ended', (params: any) => {
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
      },
      assertionFn: (res) => expect(res).toHaveLength(5),
      message: 'Expected recording lifecycle events to fire',
    })

    // --------------- Playback ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { PLAYBACK_URL: process.env.PLAYBACK_URL },
      evaluateFn: async ({ PLAYBACK_URL }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const playbackStarted = new Promise((resolve, reject) => {
          roomObj.on('playback.started', (params: any) => {
            if (params.state === 'playing') {
              resolve(true)
            } else {
              reject(new Error('[playback.started] state is not "recording"'))
            }
          })
        })

        const playbackEnded = new Promise((resolve, reject) => {
          roomObj.on('playback.ended', (params: any) => {
            if (params.state === 'completed') {
              resolve(true)
            } else {
              reject(new Error('[playback.ended] state is not "completed"'))
            }
          })
        })

        let hasPaused = false
        const playbackPaused = new Promise((resolve) => {
          roomObj.on('playback.updated', (params: any) => {
            if (params.state === 'paused') {
              hasPaused = true
              resolve(true)
            }
          })
        })

        const playbackResume = new Promise((resolve) => {
          roomObj.on('playback.updated', (params: any) => {
            if (params.state === 'playing' && hasPaused) {
              resolve(true)
            }
          })
        })

        const playbackVolume = new Promise((resolve) => {
          roomObj.on('playback.updated', (params: any) => {
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
      assertionFn: (res) => expect(res).toHaveLength(5),
      message: 'Expected playback lifecycle events to fire',
    })

    // --------------- Screenshare ---------------
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const roomObj = window._roomObj as VideoRoomSession

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
          roomObj.on('member.left', (params: any) => {
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
      },
      assertionFn: (res) => expect(res).toHaveLength(4),
      message: 'Expected screen share to join and leave',
    })

    const expectRoomMeta = async (expected: any) => {
      // --------------- Get Room Meta ---------------
      const currentMeta: any = await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj: VideoRoomSession = (window as any)._roomObj
          return roomObj.getMeta()
        },
        assertionFn: (res) => expect(res).toBeDefined(),
        message: 'Expected to get room meta',
      })
      expect(currentMeta.meta).toStrictEqual(expected)
    }

    await expectRoomMeta({})

    // --------------- Set Room Meta ---------------
    const meta = { something: 'xx-yy-zzz' }
    const resultMeta = await expectPageEvalToPass(page, {
      evaluateArgs: { meta },
      evaluateFn: async ({ meta }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const setRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params: any) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.setMeta(meta)

        return setRoomMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to set room meta',
    })
    expect(meta).toStrictEqual(resultMeta)

    await expectRoomMeta(resultMeta)

    // --------------- Update Room Meta ---------------
    const metaUpdate = { updatedKey: 'ii-oo' }
    const resultMetaUpdate = await expectPageEvalToPass(page, {
      evaluateArgs: { meta: metaUpdate },
      evaluateFn: async ({ meta }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const setRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params: any) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.updateMeta(meta)

        return setRoomMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to update room meta',
    })
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
    const resultMetaDelete = await expectPageEvalToPass(page, {
      evaluateArgs: { keys: metaDelete },
      evaluateFn: async ({ keys }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const deleteRoomMeta = new Promise((resolve) => {
          roomObj.on('room.updated', (params: any) => {
            if (params.room_session.updated?.includes('meta')) {
              resolve(params.room_session.meta)
            }
          })
        })

        await roomObj.deleteMeta(keys)

        return deleteRoomMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to delete room meta keys',
    })
    // Deletions should be partial. In this case we're
    // checking that we are only deleting the key added on
    // the "update" step and other keys remain untouched.
    expect(meta).toStrictEqual(resultMetaDelete)

    await expectRoomMeta(resultMetaDelete)

    // --------------------------

    const expectRoomMemberMeta = async (expected: any) => {
      // --------------- Get Room Meta ---------------
      const initialMeta: any = await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const roomObj = window._roomObj as VideoRoomSession
          return roomObj.getMemberMeta()
        },
        assertionFn: (res) => expect(res).toBeDefined(),
        message: 'Expected to get member meta',
      })
      expect(initialMeta.meta).toStrictEqual(expected)
    }

    expectRoomMemberMeta({})

    // --------------- Set Member Meta ---------------
    const memberMeta = { memMeta: 'xx-yy-zzz' }
    const resultMemberMeta = await expectPageEvalToPass(page, {
      evaluateArgs: { meta: memberMeta },
      evaluateFn: async ({ meta }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const setMemberMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.setMemberMeta({ meta })

        return setMemberMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to set member meta',
    })
    expect(memberMeta).toStrictEqual(resultMemberMeta)

    expectRoomMemberMeta(resultMemberMeta)

    // --------------- Update Member Meta ---------------
    const memberMetaUpdate = { updatedMemberKey: 'ii-oo' }
    const resultMemberMetaUpdate = await expectPageEvalToPass(page, {
      evaluateArgs: { meta: memberMetaUpdate },
      evaluateFn: async ({ meta }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const updateMemberMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.updateMemberMeta({ meta })

        return updateMemberMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to update member meta',
    })
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
    const resultMemberMetaDelete = await expectPageEvalToPass(page, {
      evaluateArgs: { keys: memberMetaDelete },
      evaluateFn: async ({ keys }) => {
        const roomObj = window._roomObj as VideoRoomSession

        const deleteMemberRoomMeta = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
            if (params.member.updated?.includes('meta')) {
              resolve(params.member.meta)
            }
          })
        })

        await roomObj.deleteMemberMeta({ keys })

        return deleteMemberRoomMeta
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to delete member meta keys',
    })
    // Deletions should be partial. In this case we're
    // checking that we are only deleting the key added on
    // the "update" step and other keys remain untouched.
    expect(memberMeta).toStrictEqual(resultMemberMetaDelete)

    expectRoomMemberMeta(resultMemberMetaDelete)
    // --------------------------

    const layoutName = '3x3'
    // --------------- Expect layout to change ---------------
    const layoutChangedPromise = expectLayoutChanged(page, layoutName)
    // --------------- Set layout ---------------
    await setLayoutOnPage(page, layoutName)
    expect(await layoutChangedPromise).toBe(true)
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
        const roomObj = window._roomObj as VideoRoomSession

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
      const roomObj = window._roomObj as VideoRoomSession
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
      const roomObj = window._roomObj as VideoRoomSession
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
