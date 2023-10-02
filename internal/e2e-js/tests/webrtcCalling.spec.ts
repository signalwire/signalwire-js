//import type { Relay } from '@signalwire/js@^1'
import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createTestJWTToken,
} from '../utils'
	      
test.describe('V2Calling', () => {
  test('should handle one webrtc endpoint calling to a second webrtc endpoint waiting to answer', async ({
    createCustomVanillaPage,
  }) => {
    const pageCaller = await createCustomVanillaPage({ name: '[caller]' })
    await pageCaller.goto(SERVER_URL + '/v2vanilla.html')

    const pageCallee = await createCustomVanillaPage({ name: '[callee]' })
    await pageCallee.goto(SERVER_URL + '/v2vanilla.html')

    //let counter = 1
    //const takeScreenshot = async (name: string) => {
    //  await pageCaller.screenshot({ path: `${name}_${counter}.png` })
    //  console.log('\n\n', await pageCaller.content(), '\n\n')
    //  setTimeout(() => {
    //    counter++
    //    takeScreenshot(name)
    //  }, 500)
    //}
    //await takeScreenshot('screenshot')

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    const jwtCaller = await createTestJWTToken({ 'resource': 'vanilla-caller' })
    expect(jwtCaller).not.toBe(null)

    const jwtCallee = await createTestJWTToken({ 'resource': 'vanilla-callee' })
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

    // Wait for both caller and callee to get connected to Relay
    await expectRelayConnected(pageCaller, jwtCaller)
    await expectRelayConnected(pageCallee, jwtCallee)

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

    //const numberValue = process.env.VOICE_DIAL_TO_NUMBER ?? ''
    //const numberFromValue = process.env.VOICE_DIAL_FROM_NUMBER ?? ''

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


    // Additional activity while call is up goes here

    // TODO: expect remote video on both pages to confirm streams are working

    // Only need to use page.evaluate when copying JS variables into or out of the browser
    //   Mostly used to get variables out of the browser or to wait on a resolve from inside browser side event handlers (IE, waiting for a layout.changed on RoomSession)
    //   Browser elements get their own methods to work with like fill instead of using page.evaluate
    // How do we get the Relay type defined for the return type if the module was loaded by the browser? or do we just treat it as 'any' type in typescript?
    // Is it possible to use expect for browser console output? any other pattern for testing browser console output?
    // Why such liberal use of @ts-expect-error comments that disable type checking?
    //   Is it mostly for variables that are created at runtime in the browser that typescript won't see during static analysis like this page.evaluate for client?

    //const relayClient: Relay = await pageCaller.evaluate(async () => {
    //  // @ts-expect-error
    //  const client = window.__client  
    //  return Promise.resolve(client)
    //})


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
