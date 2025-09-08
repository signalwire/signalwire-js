import { uuid } from '@signalwire/core'
import { test, expect, CustomPage } from '../../fixtures'
import { CallJoinedEventParams, type CallSession } from '@signalwire/client'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectPageEvalToPass,
} from '../../utils'

test.describe('CallCall Room Device', () => {
  test('should emit the microphone, and camera updated event', async ({
    createCustomPage,
    resource,
  }) => {
    let page = {} as CustomPage
    let roomName = ''
    let callSession = {} as CallJoinedEventParams
    let microphoneUpdatedPromise: Promise<unknown>
    let cameraUpdatedPromise: Promise<unknown>
    let devices: unknown[] = []

    await test.step('setup page and join video room', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      callSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })
      expect(callSession.room_session).toBeDefined()

      await expectMCUVisible(page)
    })

    await test.step('setup microphone updated event listener', async () => {
      microphoneUpdatedPromise = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('microphone.updated', (payload) => {
              resolve(payload)
            })
          })
        },
        assertionFn: (result) => {
          expect(
            result,
            'microphone updated event should be defined'
          ).toBeDefined()
          expect(
            result,
            'microphone updated event should have previous deviceId'
          ).toHaveProperty('previous.deviceId')
          expect(
            result,
            'microphone updated event should have previous label'
          ).toHaveProperty('previous.label')
          expect(
            result,
            'microphone updated event should have current deviceId'
          ).toHaveProperty('current.deviceId')
          expect(
            result,
            'microphone updated event should have current label'
          ).toHaveProperty('current.label')
        },
        message: 'expect to set up microphone updated event listener',
      })
    })

    await test.step('setup camera updated event listener', async () => {
      cameraUpdatedPromise = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('camera.updated', (payload) => {
              resolve(payload)
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'camera updated event should be defined').toBeDefined()
          expect(
            result,
            'camera updated event should have previous deviceId'
          ).toHaveProperty('previous.deviceId')
          expect(
            result,
            'camera updated event should have previous label'
          ).toHaveProperty('previous.label')
          expect(
            result,
            'camera updated event should have current deviceId'
          ).toHaveProperty('current.deviceId')
          expect(
            result,
            'camera updated event should have current label'
          ).toHaveProperty('current.label')
        },
        message: 'expect to set up camera updated event listener',
      })
    })

    await test.step('update microphone device', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          await callObj.updateMicrophone({ deviceId: 'test-mic-id' })
          return true
        },
        assertionFn: (result) => {
          expect(result, 'microphone update should be successful').toBe(true)
        },
        message: 'expect to update microphone device',
      })
    })

    await test.step('update camera device', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          await callObj.updateCamera({ deviceId: 'test-camera-id' })
          return true
        },
        assertionFn: (result) => {
          expect(result, 'camera update should be successful').toBe(true)
        },
        message: 'expect to update camera device',
      })
    })

    await test.step('wait for device update events and verify', async () => {
      // Wait for both promises to resolve
      const microphoneEvent = await microphoneUpdatedPromise
      const cameraEvent = await cameraUpdatedPromise

      devices = [microphoneEvent, cameraEvent]

      expect(devices).toHaveLength(2)
      devices.forEach((item) => {
        expect(item).toHaveProperty('previous.deviceId')
        expect(item).toHaveProperty('previous.label')
        expect(item).toHaveProperty('current.deviceId')
        expect(item).toHaveProperty('current.label')
      })
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
    let page = {} as CustomPage
    let roomName = ''
    let callSession = {} as CallJoinedEventParams
    let speakerId = ''
    let speakerUpdatedPromise: Promise<unknown>
    let device: unknown

    await test.step('setup page and join video room', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      callSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })
      expect(callSession.room_session).toBeDefined()

      await expectMCUVisible(page)
    })

    await test.step('get available speaker device ID', async () => {
      speakerId = await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const devices = await navigator.mediaDevices?.enumerateDevices()

          if (!devices) {
            throw new Error('Media devices not available')
          }

          const audioOutputDevices = devices.filter(
            (device) =>
              device.kind === 'audiooutput' && device.deviceId !== 'default'
          )

          if (audioOutputDevices.length === 0) {
            throw new Error('No non-default audio output devices found')
          }

          return audioOutputDevices[0].deviceId
        },
        assertionFn: (result) => {
          expect(result, 'speaker device ID should be defined').toBeDefined()
          expect(typeof result, 'speaker device ID should be string').toBe(
            'string'
          )
          expect(result, 'speaker device ID should not be empty').not.toBe('')
        },
        message: 'expect to get available speaker device ID',
      })
    })

    await test.step('setup speaker updated event listener', async () => {
      speakerUpdatedPromise = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('speaker.updated', (payload) => {
              resolve(payload)
            })
          })
        },
        assertionFn: (result) => {
          expect(
            result,
            'speaker updated event should be defined'
          ).toBeDefined()
          expect(
            result,
            'speaker updated event should have previous deviceId'
          ).toHaveProperty('previous.deviceId')
          expect(
            result,
            'speaker updated event should have previous label'
          ).toHaveProperty('previous.label')
          expect(
            result,
            'speaker updated event should have current deviceId'
          ).toHaveProperty('current.deviceId')
          expect(
            result,
            'speaker updated event should have current label'
          ).toHaveProperty('current.label')
        },
        message: 'expect to set up speaker updated event listener',
      })
    })

    await test.step('update speaker device', async () => {
      await expectPageEvalToPass(page, {
        evaluateArgs: { speakerId },
        evaluateFn: async (params) => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          await callObj.updateSpeaker({ deviceId: params.speakerId })
          return true
        },
        assertionFn: (result) => {
          expect(result, 'speaker update should be successful').toBe(true)
        },
        message: 'expect to update speaker device',
      })
    })

    await test.step('wait for speaker updated event and verify', async () => {
      // Wait for the speaker updated event
      device = await speakerUpdatedPromise

      expect(device).toHaveProperty('previous.deviceId')
      expect(device).toHaveProperty('previous.label')
      expect(device).toHaveProperty('current.deviceId')
      expect(device).toHaveProperty('current.label')
    })
  })

  test('should emit the speaker disconnected event', async ({
    createCustomPage,
    resource,
  }) => {
    let page = {} as CustomPage
    let roomName = ''
    let callSession = {} as CallJoinedEventParams
    let speakerDisconnectedPromise: Promise<unknown>
    let device: unknown

    await test.step('setup page and mock initial device enumeration', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      // Set up initial mock for enumerate devices with default speaker
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          // Mock the enumerate devices to return a default speaker
          navigator.mediaDevices.enumerateDevices = async () => {
            return [
              {
                deviceId: 'default',
                kind: 'audiooutput',
                label: 'Default Speaker',
              } as MediaDeviceInfo,
            ]
          }

          return true
        },
        assertionFn: (result) => {
          expect(result, 'device enumeration mock should be set up').toBe(true)
        },
        message: 'expect to mock initial device enumeration',
      })
    })

    await test.step('create client and join video room', async () => {
      await createCFClient(page)

      // Dial an address and join a video room
      callSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })
      expect(callSession.room_session).toBeDefined()

      await expectMCUVisible(page)
    })

    await test.step('setup speaker disconnected event listener', async () => {
      speakerDisconnectedPromise = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('speaker.disconnected', (payload) => {
              resolve(payload)
            })
          })
        },
        assertionFn: (result) => {
          expect(
            result,
            'speaker disconnected event should be defined'
          ).toBeDefined()
          expect(
            result,
            'speaker disconnected event should have deviceId'
          ).toHaveProperty('deviceId')
          expect(
            result,
            'speaker disconnected event should have label'
          ).toHaveProperty('label')
        },
        message: 'expect to set up speaker disconnected event listener',
      })
    })

    await test.step('mock device removal and trigger disconnection', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          // Change the enumerate devices to return empty array (no devices)
          navigator.mediaDevices.enumerateDevices = async () => {
            return []
          }

          // Trigger the devicechange event to simulate device removal
          const event = new Event('devicechange')
          navigator.mediaDevices.dispatchEvent(event)

          return true
        },
        assertionFn: (result) => {
          expect(result, 'device removal simulation should be successful').toBe(
            true
          )
        },
        message: 'expect to mock device removal and trigger disconnection',
      })
    })

    await test.step('wait for speaker disconnected event and verify', async () => {
      // Wait for the speaker disconnected event
      device = await speakerDisconnectedPromise

      expect(device).toStrictEqual({
        deviceId: 'default',
        label: 'Default Speaker',
      })
    })
  })
})
