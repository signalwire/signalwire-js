import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createRestApiCall,
  createTestJWTToken,
  expectv2TotalAudioEnergyToBeGreaterThan,
  randomizeResourceName,
} from '../utils'
	      
test.describe('V2Calling', () => {
  test('should handle one v2 webrtc endpoint connecting, receiving a call from a REST API Create Call request, answering and being connected to a Laml bin', async ({
    createCustomVanillaPage,
  }) => {
    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    const relayHost = process.env.RELAY_HOST ?? ''
    const expectInjectRelayHost = async (page: Page, host: string) => {
      await page.evaluate(async (params) => {
        // @ts-expect-error
        window.__host = params.host
      },
      {
        host: host
      })
    }

    await expectInjectRelayHost(pageCallee, relayHost)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const resource = randomizeResourceName()
    const jwtCallee = await createTestJWTToken({ 'resource': resource })
    expect(jwtCallee).not.toBe(null)

    const expectRelayConnected = async (page: Page, jwt: string) => {
      // Project locator
      const project = page.locator('#project')
      expect(project).not.toBe(null)

      // Token locator
      const token = page.locator('#token')
      expect(token).not.toBe(null)

      // Populate project and token using locators
      await project.fill(envRelayProject)
      await token.fill(jwt)

      // Click the connect button, which calls the connect function in the browser
      await page.click('#btnConnect')

      // Start call button locator
      const startCall = page.locator('#startCall')
      expect(startCall).not.toBe(null)

      // Wait for call button to be enabled when signalwire.ready occurs
      await expect(startCall).toBeEnabled()
    }

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
    // Ensure the remote end doesn't hangup before - TODO: cover that case
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
