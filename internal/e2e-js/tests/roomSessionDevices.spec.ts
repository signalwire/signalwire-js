import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
} from '../utils'

test.describe('RoomSessionDevices', () => {
  test('should emit the microphone, and camera updated event', async ({
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
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the microphone & camera ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const microphoneUpdated = new Promise((resolve) => {
        roomObj.on('microphone.updated', () => {
          resolve(true)
        })
      })

      const cameraUpdated = new Promise((resolve) => {
        roomObj.on('camera.updated', () => {
          resolve(true)
        })
      })

      await roomObj.updateMicrophone({ deviceId: 'test-mic-id' })
      await roomObj.updateCamera({ deviceId: 'test-camera-id' })

      return Promise.all([microphoneUpdated, cameraUpdated])
    })
  })

  test.skip('should emit the speaker updated event', async ({
    createCustomPage,
    browserName,
  }) => {
    if (browserName.toLowerCase() !== 'chromium') return

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
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the speaker ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const speakerUpdated = new Promise((resolve) => {
        roomObj.on('speaker.updated', () => {
          resolve(true)
        })
      })

      await roomObj.updateSpeaker({ deviceId: 'default' })

      return Promise.all([speakerUpdated])
    })
  })
})
