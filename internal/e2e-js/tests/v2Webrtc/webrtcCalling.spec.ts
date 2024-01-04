import { expect, Page, test } from '../../fixtures'

import {
  SERVER_URL,
  createTestJWTToken,
  expectRelayConnected,
  expectv2TotalAudioEnergyToBeGreaterThan,
} from '../../utils'

test.describe('V2Calling', () => {
  test('should handle one webrtc endpoint calling to a second webrtc endpoint waiting to answer', async ({
    createCustomVanillaPage,
  }) => {
    const pageCaller = await createCustomVanillaPage({ name: '[caller]' })
    await pageCaller.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    const expectInjectRelayHost = async (page: Page, host: string) => {
      await page.evaluate(
        async (params) => {
          // @ts-expect-error
          window.__host = params.host
        },
        {
          host: host,
        }
      )
    }

    await expectInjectRelayHost(pageCaller, relayHost)
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const jwtCaller = await createTestJWTToken({ resource: 'vanilla-caller' })
    expect(jwtCaller).not.toBe(null)

    const jwtCallee = await createTestJWTToken({ resource: 'vanilla-callee' })
    expect(jwtCallee).not.toBe(null)

    // Wait for both caller and callee to get connected to Relay
    await expectRelayConnected(pageCaller, envRelayProject, jwtCaller)
    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)

    const expectCallStarted = async (page: Page, to: string, from: string) => {
      // To Number locator
      const number = page.locator('#number')
      expect(number).not.toBe(null)

      // From Number locator
      const numberFrom = page.locator('#numberFrom')
      expect(numberFrom).not.toBe(null)

      // Populate to and from numbers
      await number.fill(to)
      await numberFrom.fill(from)

      // Click the call button, which calls the makeCall function in the browser
      await page.click('#startCall')

      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for hangup button to be enabled when call update trying or active occurs
      await expect(hangupCall).toBeEnabled()
    }

    // Wait for caller to start the call
    await expectCallStarted(pageCaller, 'vanilla-callee', 'vanilla-caller')

    // Call status locators
    const callStatusCaller = pageCaller.locator('#callStatus')
    expect(callStatusCaller).not.toBe(null)

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)

    // Wait for call to be active on both caller and callee
    await expect(callStatusCaller).toContainText('-> active')
    await expect(callStatusCallee).toContainText('-> active')

    // Additional activity while call is up can go here
    const expectVideoMediaStreams = async (page: Page) => {
      const result = await page.evaluate(() => {
        return {
          localVideo:
            (document.getElementById('localVideo') as HTMLVideoElement)
              ?.srcObject instanceof MediaStream,
          remoteVideo:
            (document.getElementById('remoteVideo') as HTMLVideoElement)
              ?.srcObject instanceof MediaStream,
        }
      })

      expect(result.localVideo).toBe(true)
      expect(result.remoteVideo).toBe(true)
    }

    await expectVideoMediaStreams(pageCaller)
    await expectVideoMediaStreams(pageCallee)

    // FIXME: Expect audio energy level is flaky
    // Give some time to collect audio from both pages
    await pageCaller.waitForTimeout(10000)

    // Check the audio energy level is above threshold
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCaller, 0.4)
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, 0.4)

    // Click the caller hangup button, which calls the hangup function in the browser
    await pageCaller.click('#hangupCall')

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    // Wait for both caller and callee to hangup
    await expectCallHangup(pageCaller)
    await expectCallHangup(pageCallee)
  })
})
