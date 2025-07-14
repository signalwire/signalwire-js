import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import type { CallSession } from '@signalwire/client'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'

test.describe('CallFabric Room Device', () => {
  test('should emit the microphone, and camera updated event', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })
    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Change the microphone & camera ---------------
    const devices = await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj

      const microphoneUpdated = new Promise((resolve) => {
        callObj.on('microphone.updated', (payload) => {
          resolve(payload)
        })
      })

      const cameraUpdated = new Promise((resolve) => {
        callObj.on('camera.updated', (payload) => {
          resolve(payload)
        })
      })

      await callObj.updateMicrophone({ deviceId: 'test-mic-id' })
      await callObj.updateCamera({ deviceId: 'test-camera-id' })

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
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })
    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Change the microphone & camera ---------------
    const devices = await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj
      const localAudioTrack = callObj.localAudioTrack!
      const localVideoTrack = callObj.localVideoTrack!

      const microphoneDisconnected = new Promise((resolve) => {
        callObj.on('microphone.disconnected', (payload) => {
          resolve(payload)
        })
        const endedEvent = new Event('ended')
        localAudioTrack.dispatchEvent(endedEvent)
      })

      const cameraDisconnected = new Promise((resolve) => {
        callObj.on('camera.disconnected', (payload) => {
          resolve(payload)
        })
        const endedEvent = new Event('ended')
        localVideoTrack.dispatchEvent(endedEvent)
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
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })
    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Change the speaker ---------------
    const device = await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj

      const speakerUpdated = new Promise((resolve) => {
        callObj.on('speaker.updated', (payload) => {
          resolve(payload)
        })
      })

      const speakerId = (await navigator.mediaDevices?.enumerateDevices())
        .filter(
          (device) =>
            device.kind === 'audiooutput' && device.deviceId !== 'default'
        )
        .map((device) => device.deviceId)[0]

      await callObj.updateSpeaker({ deviceId: speakerId })

      return await speakerUpdated
    })

    expect(device).toHaveProperty('previous.deviceId')
    expect(device).toHaveProperty('previous.label')
    expect(device).toHaveProperty('current.deviceId')
    expect(device).toHaveProperty('current.label')
  })

  test('should emit the speaker disconnected event', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

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

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })
    expect(callSession.room_session).toBeDefined()

    await expectMCUVisible(page)

    // --------------- Change the speaker -------------
    const device = await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj

      navigator.mediaDevices.enumerateDevices = async () => {
        return []
      }

      const speakerDisconnected = new Promise((resolve) => {
        callObj.on('speaker.disconnected', (payload) => {
          resolve(payload)
        })
        const event = new Event('devicechange')
        navigator.mediaDevices.dispatchEvent(event)
      })

      return await speakerDisconnected
    })

    expect(device).toStrictEqual({
      deviceId: 'default',
      label: 'Default Speaker',
    })
  })
})
