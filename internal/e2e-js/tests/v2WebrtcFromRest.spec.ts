import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createRestApiCall,
  createTestJWTToken,
  expectInjectRelayHost,
  expectRelayConnected,
  expectv2TotalAudioEnergyToBeGreaterThan,
  randomizeResourceName,
} from '../utils'
	      
test.describe('V2Calling incoming from REST API', () => {
  test('should handle one v2 webrtc endpoint connecting, receiving a call from a REST API Create Call request, answering and being connected to a Laml bin', async ({
    createCustomVanillaPage,
  }) => {
    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ 'resource': resource })
    expect(jwtCallee).not.toBe(null)

    await expectRelayConnected(pageCallee, jwtCallee)

    const createResult = await createRestApiCall(resource)
    expect(createResult).toBe(201)

    const callStatusCallee = pageCallee.locator('#callStatus')
    expect(callStatusCallee).not.toBe(null)

    await expect(callStatusCallee).toContainText('-> active')

    // Give some time to collect audio
    await pageCallee.waitForTimeout(10000)

    // Check the audio energy level is above threshold
     await expectv2TotalAudioEnergyToBeGreaterThan(pageCallee, 0.2)

    // Click the callee hangup button, which calls the hangup function in the browser
    // Ensure the remote end doesn't hangup before
    await pageCallee.click('#hangupCall')

    const expectCallHangup = async (page: Page) => {
      // Hangup call button locator
      const hangupCall = page.locator('#hangupCall')
      expect(hangupCall).not.toBe(null)

      // Wait for call to be hung up
      await expect(hangupCall).toBeDisabled()
    }

    await expectCallHangup(pageCallee)
  })
})
