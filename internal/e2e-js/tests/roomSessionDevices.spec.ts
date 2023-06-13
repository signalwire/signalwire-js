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
    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
      },
      initialEvents: [],
    })

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the microphone & camera ---------------
    const device = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const microphoneUpdated = new Promise((resolve) => {
        roomObj.on('microphone.updated', (payload) => {
          resolve(payload)
        })
      })

      const cameraUpdated = new Promise((resolve) => {
        roomObj.on('camera.updated', (payload) => {
          resolve(payload)
        })
      })

      const speakerUpdated = new Promise((resolve) => {
        roomObj.on('speaker.updated', (payload) => {
          resolve(payload)
        })
      })

      await roomObj.updateMicrophone({ deviceId: 'test-mic-id' })
      await roomObj.updateCamera({ deviceId: 'test-camera-id' })
      // await roomObj.updateSpeaker({ deviceId: 'default' })

      return Promise.all([microphoneUpdated, cameraUpdated])
    })

    expect(device).toHaveLength(2)
    device.forEach((item) => {
      expect(item).toHaveProperty('previous.deviceId')
      expect(item).toHaveProperty('previous.label')
      expect(item).toHaveProperty('current.deviceId')
      expect(item).toHaveProperty('current.label')
    })
  })
})
