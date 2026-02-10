import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoinWithDefaults,
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
    const joinParams = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the microphone & camera ---------------
    const devices = await page.evaluate(async () => {
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

      await roomObj.updateMicrophone({ deviceId: 'test-mic-id' })
      await roomObj.updateCamera({ deviceId: 'test-camera-id' })

      return Promise.all([microphoneUpdated, cameraUpdated])
    })

    expect(devices).toHaveLength(2)
    devices.forEach((item) => {
      expect(item).toHaveProperty('previous.deviceId')
      expect(item).toHaveProperty('previous.label')
      expect(item).toHaveProperty('current.deviceId')
      expect(item).toHaveProperty('current.label')
    })
  })

  test('should emit the microphone, and camera disconnected event', async ({
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
    const joinParams = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the microphone & camera ---------------
    const devices = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const stream = roomObj.localStream!

      const microphoneDisconnected = new Promise((resolve) => {
        roomObj.on('microphone.disconnected', (payload) => {
          resolve(payload)
        })
        const track = stream.getAudioTracks()[0]
        const endedEvent = new Event('ended')
        track.dispatchEvent(endedEvent)
      })

      const cameraDisconnected = new Promise((resolve) => {
        roomObj.on('camera.disconnected', (payload) => {
          resolve(payload)
        })
        const track = stream.getVideoTracks()[0]
        const endedEvent = new Event('ended')
        track.dispatchEvent(endedEvent)
      })

      return Promise.all([microphoneDisconnected, cameraDisconnected])
    })

    expect(devices).toHaveLength(2)
    devices.forEach((item) => {
      expect(item).toHaveProperty('deviceId')
      expect(item).toHaveProperty('label')
    })
  })

  test('should emit the speaker updated event', async ({
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
    const joinParams = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the speaker ---------------
    const device = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const speakerUpdated = new Promise((resolve) => {
        roomObj.on('speaker.updated', (payload) => {
          resolve(payload)
        })
      })

      const speakerId = (await navigator.mediaDevices?.enumerateDevices())
        .filter(
          (device) =>
            device.kind === 'audiooutput' && device.deviceId !== 'default'
        )
        .map((device) => device.deviceId)[0]

      await roomObj.updateSpeaker({ deviceId: speakerId })

      return await speakerUpdated
    })

    expect(device).toHaveProperty('previous.deviceId')
    expect(device).toHaveProperty('previous.label')
    expect(device).toHaveProperty('current.deviceId')
    expect(device).toHaveProperty('current.label')
  })

  test('should emit the speaker disconnected event', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('join-leave-e2e')

    page.evaluate(async () => {
      // @ts-expect-error
      navigator.mediaDevices.enumerateDevices = async () => {
        return [
          {
            deviceId: 'default',
            kind: 'audiooutput',
            label: 'Default Speaker',
          },
        ]
      }
    })

    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
      },
      initialEvents: [],
    })

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoinWithDefaults(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // --------------- Change the speaker -------------
    const device = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      navigator.mediaDevices.enumerateDevices = async () => {
        return []
      }

      const speakerDisconnected = new Promise((resolve) => {
        roomObj.on('speaker.disconnected', (payload) => {
          resolve(payload)
        })
        const event = new Event('devicechange')
        navigator.mediaDevices.dispatchEvent(event)
      })

      return await speakerDisconnected
    })

    expect(device).toHaveProperty('deviceId')
    expect(device).toHaveProperty('label')
  })
})
