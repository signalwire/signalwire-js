import { CallSession } from '@signalwire/client'
import { resolve } from 'node:path'
import { constants, accessSync } from 'node:fs'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'
import { uuid } from '@signalwire/core'

const videoFile = resolve(__dirname, '../../assets/sw-docs.y4m')

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${videoFile}`,
    ],
  },
})

type Test = {
  mirrored: boolean
}

test.describe('CallUCall Mirror Video', () => {
  const tests: Test[] = [{ mirrored: false }, { mirrored: true }]

  test.beforeAll(() => {
    try {
      accessSync(videoFile, constants.R_OK)
    } catch (err) {
      throw new Error(`❌ Missing fake video file at ${videoFile}`)
    }
  })

  tests.forEach(({ mirrored }) => {
    test(`should display the video ${
      mirrored ? 'mirrored' : 'unmirrored'
    } by default and toggle to ${
      !mirrored ? 'mirrored' : 'unmirrored'
    }`, async ({ createCustomPage, resource }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
        dialOptions: {
          mirrorLocalVideoOverlay: mirrored,
        },
      })

      await expectMCUVisible(page)

      const video = page.locator('div[id^="sw-sdk-"] > video')

      const expectedInitial = mirrored
        ? 'video-flipped.png'
        : 'video-normal.png'
      const expectedAfterToggle = mirrored
        ? 'video-normal.png'
        : 'video-flipped.png'

      await expect(video).toHaveScreenshot(expectedInitial)

      // Toggle the mirror state
      await page.evaluate((mirrored) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj
        callObj.localVideoOverlay?.setMirror(!mirrored)
      }, mirrored)

      await expect(video).toHaveScreenshot(expectedAfterToggle)
    })
  })
})
