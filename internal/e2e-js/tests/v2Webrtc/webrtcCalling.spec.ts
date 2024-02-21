import { expect, Page, test } from '../../fixtures'

import {
  SERVER_URL,
  createCallWithCompatibilityApi,
  createTestJWTToken,
  expectInjectRelayHost,
  expectRelayConnected,
  expectv2TotalAudioEnergyToBeGreaterThan,
} from '../../utils'

test.describe('V2Calling', () => {
  const expectCallHangup = async (page: Page) => {
    // Hangup call button locator
    const hangupCall = page.locator('#hangupCall')
    expect(hangupCall).not.toBe(null)

    // Wait for call to be hung up
    await expect(hangupCall).toBeDisabled()
  }

  test('should handle one to one calling', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should handle one to one calling')

    const pageCaller = await createCustomVanillaPage({ name: '[caller]' })
    await pageCaller.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''

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
              .srcObject instanceof MediaStream,
          remoteVideo:
            (document.getElementById('remoteVideo') as HTMLVideoElement)
              .srcObject instanceof MediaStream,
        }
      })

      expect(result.localVideo).toBe(true)
      expect(result.remoteVideo).toBe(true)
    }

    await expectVideoMediaStreams(pageCaller)
    await expectVideoMediaStreams(pageCallee)

    // Click the caller hangup button, which calls the hangup function in the browser
    await pageCaller.click('#hangupCall')

    // Wait for both caller and callee to hangup
    await expectCallHangup(pageCaller)
    await expectCallHangup(pageCallee)

    console.info('END: should handle one to one calling')
  })

  test('should receive a call from LaML and expect an audio', async ({
    createCustomVanillaPage,
  }) => {
    console.info('START: should receive a call from LaML and expect an audio')

    const RESOURCE = 'vanilla-laml-callee'
    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const jwtCallee = await createTestJWTToken({
      resource: RESOURCE,
    })
    expect(jwtCallee).not.toBe(null)

    // Wait for the callee to get connected to Relay
    await expectRelayConnected(pageCallee, envRelayProject, jwtCallee)

    // Dial to this callee from LaML
    const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play loop="0">https://cdn.signalwire.com/default-music/welcome.mp3</Play>
      </Response>`
    const createResult = await createCallWithCompatibilityApi(
      RESOURCE,
      inlineLaml
    )
    expect(createResult).toBe(201)

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)
    await expect(callStatusCallee).toContainText('-> active')

    // Give some time to collect audio from both pages
    await pageCallee.waitForTimeout(20000)

    console.log('Checking for audio energy')
    await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, 0.1)

    // Click the caller hangup button, which calls the hangup function in the browser
    await pageCallee.click('#hangupCall')

    // Wait for callee to hangup
    await expectCallHangup(pageCallee)

    console.info('END: should receive a call from LaML and expect an audio')
  })
})
