import { uuid } from '@signalwire/core'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectPageEvalToPass,
  SERVER_URL,
} from '../../utils'
import { test, expect, CustomPage } from '../../fixtures'
import { CallJoinedEventParams } from '@signalwire/client'

type CameraTest = {
  stopCameraWhileMuted: boolean
}

type MicrophoneTest = {
  stopMicrophoneWhileMuted: boolean
}

test.describe('CallCall - Device State', () => {
  const cameraTests: CameraTest[] = [
    { stopCameraWhileMuted: false },
    { stopCameraWhileMuted: true },
  ]

  const microphoneTests: MicrophoneTest[] = [
    { stopMicrophoneWhileMuted: false },
    { stopMicrophoneWhileMuted: true },
  ]

  cameraTests.forEach(({ stopCameraWhileMuted }) => {
    test(`should turn off the camera ${
      stopCameraWhileMuted
        ? 'by stopping the device'
        : 'without stopping the device'
    }`, async ({ createCustomPage, resource }) => {
      let page = {} as CustomPage
      let roomName = ''
      let callSession = {} as CallJoinedEventParams
      let memberId = ''

      await test.step('setup page and join video room', async () => {
        page = await createCustomPage({ name: '[page]' })
        await page.goto(SERVER_URL)

        roomName = `e2e_${uuid()}`
        await resource.createCallSessionResource(roomName)

        await createCFClient(page)

        // Dial an address and join a video room
        callSession = await dialAddress(page, {
          address: `/public/${roomName}?channel=video`,
          dialOptions: {
            stopCameraWhileMuted,
          },
        })
        memberId = callSession.member_id

        await expectMCUVisible(page)
      })

      await test.step('mute the self video', async () => {
        let memberUpdatedMutedPromise: Promise<boolean>

        // Step 1: Set up event listener for video mute
        memberUpdatedMutedPromise = expectPageEvalToPass(page, {
          evaluateArgs: { memberId },
          evaluateFn: (params) => {
            return new Promise<boolean>((resolve) => {
              const callObj = window._callObj

              if (!callObj) {
                throw new Error('Call object not found')
              }

              callObj.on('member.updated.videoMuted', (event) => {
                if (
                  event.member.member_id === params.memberId &&
                  event.member.video_muted === true
                ) {
                  resolve(true)
                }
              })
            })
          },
          assertionFn: (result) => {
            expect(result, 'video muted event should fire').toBe(true)
          },
          message: 'expect to set up video muted event listener',
        })

        // Step 2: Execute video mute operation
        await expectPageEvalToPass(page, {
          evaluateFn: async () => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            await callObj.videoMute()
            return true
          },
          assertionFn: (result) => {
            expect(result, 'video mute operation should complete').toBe(true)
          },
          message: 'expect to execute video mute operation',
        })

        // Step 3: Wait for the member updated event
        const eventReceived = await memberUpdatedMutedPromise
        expect(eventReceived, 'video muted event should be received').toBe(true)
      })

      await test.step(`assert that the camera is ${
        stopCameraWhileMuted ? 'off' : 'on'
      }`, async () => {
        await expectPageEvalToPass(page, {
          evaluateFn: () => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            const localStreams = callObj.localStream

            if (!localStreams) {
              throw new Error('Local streams not found')
            }

            const videoTracks = localStreams.getVideoTracks()

            if (videoTracks.length === 0) {
              return false // No video tracks means camera is off
            }

            return Boolean(videoTracks[0]?.enabled)
          },
          assertionFn: (result) => {
            expect(typeof result, 'camera state should be boolean').toBe(
              'boolean'
            )
            expect(
              result,
              `camera should be ${stopCameraWhileMuted ? 'off' : 'on'}`
            ).toBe(!stopCameraWhileMuted)
          },
          message: 'expect to get camera state from local video tracks',
        })
      })
    })
  })

  microphoneTests.forEach(({ stopMicrophoneWhileMuted }) => {
    test(`should turn off the microphone ${
      stopMicrophoneWhileMuted
        ? 'by stopping the device'
        : 'without stopping the device'
    }`, async ({ createCustomPage, resource }) => {
      let page = {} as CustomPage
      let roomName = ''
      let callSession = {} as CallJoinedEventParams
      let memberId = ''

      await test.step('setup page and join video room', async () => {
        page = await createCustomPage({ name: '[page]' })
        await page.goto(SERVER_URL)

        roomName = `e2e_${uuid()}`
        await resource.createCallSessionResource(roomName)

        await createCFClient(page)

        // Dial an address and join a video room
        callSession = await dialAddress(page, {
          address: `/public/${roomName}?channel=video`,
          dialOptions: {
            stopMicrophoneWhileMuted,
          },
        })
        memberId = callSession.member_id

        await expectMCUVisible(page)
      })

      await test.step('mute the self audio', async () => {
        let memberUpdatedMutedPromise: Promise<boolean>

        // Step 1: Set up event listener for audio mute
        memberUpdatedMutedPromise = expectPageEvalToPass(page, {
          evaluateArgs: { memberId },
          evaluateFn: (params) => {
            return new Promise<boolean>((resolve) => {
              const callObj = window._callObj

              if (!callObj) {
                throw new Error('Call object not found')
              }

              callObj.on('member.updated.audioMuted', (event) => {
                if (
                  event.member.member_id === params.memberId &&
                  event.member.audio_muted === true
                ) {
                  resolve(true)
                }
              })
            })
          },
          assertionFn: (result) => {
            expect(result, 'audio muted event should fire').toBe(true)
          },
          message: 'expect to set up audio muted event listener',
        })

        // Step 2: Execute audio mute operation
        await expectPageEvalToPass(page, {
          evaluateFn: async () => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            await callObj.audioMute()
            return true
          },
          assertionFn: (result) => {
            expect(result, 'audio mute operation should complete').toBe(true)
          },
          message: 'expect to execute audio mute operation',
        })

        // Step 3: Wait for the member updated event
        const eventReceived = await memberUpdatedMutedPromise
        expect(eventReceived, 'audio muted event should be received').toBe(true)
      })

      await test.step(`assert that the microphone is ${
        stopMicrophoneWhileMuted ? 'off' : 'on'
      }`, async () => {
        await expectPageEvalToPass(page, {
          evaluateFn: () => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            const localStreams = callObj.localStream

            if (!localStreams) {
              throw new Error('Local streams not found')
            }

            const audioTracks = localStreams.getAudioTracks()

            if (audioTracks.length === 0) {
              return false // No audio tracks means microphone is off
            }

            return Boolean(audioTracks[0]?.enabled)
          },
          assertionFn: (result) => {
            expect(typeof result, 'microphone state should be boolean').toBe(
              'boolean'
            )
            expect(
              result,
              `microphone should be ${stopMicrophoneWhileMuted ? 'off' : 'on'}`
            ).toBe(!stopMicrophoneWhileMuted)
          },
          message: 'expect to get microphone state from local audio tracks',
        })
      })
    })
  })
})
