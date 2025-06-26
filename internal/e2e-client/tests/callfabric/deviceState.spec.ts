import { uuid } from '@signalwire/core'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  SERVER_URL,
} from '../../utils'
import { test, expect } from '../../fixtures'
import { UnifiedCommunicationSession } from '@signalwire/client'

type CameraTest = {
  stopCameraWhileMuted: boolean
}

type MicrophoneTest = {
  stopMicrophoneWhileMuted: boolean
}

test.describe('CallFabric - Device State', () => {
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
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e-video-room-${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      const roomSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
        dialOptions: {
          stopCameraWhileMuted,
        },
      })
      const memberId = roomSession.member_id

      await expectMCUVisible(page)

      // --------------- Muting Video (self) ---------------
      await test.step('mute the self video', async () => {
        await page.evaluate(async (memberId) => {
          // @ts-expect-error
          const roomObj: UnifiedCommunicationSession = window._roomObj

          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.videoMuted', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.video_muted === true
              ) {
                res(true)
              }
            })
          })

          await roomObj.videoMute()
          await memberUpdatedMutedEvent
        }, memberId)
      })

      await test.step(`assert that the camera is ${
        stopCameraWhileMuted ? 'off' : 'on'
      }`, async () => {
        const cameraOn = await page.evaluate(() => {
          // @ts-expect-error
          const roomObj: UnifiedCommunicationSession = window._roomObj
          const localStreams = roomObj.localStream
          return Boolean(localStreams?.getVideoTracks()[0]?.enabled)
        })
        expect(cameraOn).toBe(!stopCameraWhileMuted)
      })
    })
  })

  microphoneTests.forEach(({ stopMicrophoneWhileMuted }) => {
    test(`should turn off the microphone ${
      stopMicrophoneWhileMuted
        ? 'by stopping the device'
        : 'without stopping the device'
    }`, async ({ createCustomPage, resource }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e-video-room-${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      const roomSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
        dialOptions: {
          stopMicrophoneWhileMuted,
        },
      })
      const memberId = roomSession.member_id

      await expectMCUVisible(page)

      // --------------- Muting Audio (self) ---------------
      await test.step('mute the self video', async () => {
        await page.evaluate(async (memberId) => {
          // @ts-expect-error
          const roomObj: UnifiedCommunicationSession = window._roomObj

          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.audioMuted', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.audio_muted === true
              ) {
                res(true)
              }
            })
          })

          await roomObj.audioMute()
          await memberUpdatedMutedEvent
        }, memberId)
      })

      await test.step(`assert that the microphone is ${
        stopMicrophoneWhileMuted ? 'off' : 'on'
      }`, async () => {
        const micOn = await page.evaluate(() => {
          // @ts-expect-error
          const roomObj: UnifiedCommunicationSession = window._roomObj
          const localStreams = roomObj.localStream
          return Boolean(localStreams?.getAudioTracks()[0]?.enabled)
        })
        expect(micOn).toBe(!stopMicrophoneWhileMuted)
      })
    })
  })
})
