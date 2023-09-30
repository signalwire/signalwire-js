import { waitForVideoReady } from 'packages/js/src/utils/videoElement'
import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestJWTToken,
} from '../utils'
	      
test.describe('V2Calling', () => {
  test('should handle one webrtc endpoint calling to a second webrtc endpoint waiting to answer', async ({
    createCustomVanillaPage,
  }) => {
    const page = await createCustomVanillaPage({ name: '[page]' })
    await page.goto(SERVER_URL + '/v2vanilla.html')

    //let counter = 1
    //const takeScreenshot = async (name: string) => {
    //  await page.screenshot({ path: `${name}_${counter}.png` })
    //  console.log('\n\n', await page.content(), '\n\n')
    //  setTimeout(() => {
    //    counter++
    //    takeScreenshot(name)
    //  }, 500)
    //}
    //await takeScreenshot('screenshot')    

    // Project locator and env value
    const project = page.locator('#project')
    expect(project).not.toBe(null)

    const envRelayProject = process.env.RELAY_PROJECT ?? ''
    expect(envRelayProject).not.toBe(null)

    // Token locator and generated value
    const token = page.locator('#token')
    expect(token).not.toBe(null)

    const jwt = await createTestJWTToken({ })
    expect(jwt).not.toBe(null)

    // Connect button locator
    const btnConnect = page.locator('#btnConnect')
    expect(btnConnect).not.toBe(null)

    // Connect status locator
    const connectStatus = page.locator('#connectStatus')
    expect(connectStatus).not.toBe(null)

    console.log(await connectStatus.innerText())

    // To Number locator and env value
    const number = page.locator('#number')
    expect(number).not.toBe(null)

    const envVoiceDialToNumber = process.env.VOICE_DIAL_TO_NUMBER ?? ''
    expect(envVoiceDialToNumber).not.toBe(null)

    // From Number locator and env value
    const numberFrom = page.locator('#numberFrom')
    expect(numberFrom).not.toBe(null)

    const envVoiceDialFromNumber = process.env.VOICE_DIAL_FROM_NUMBER ?? ''
    expect(envVoiceDialFromNumber).not.toBe(null)

    // Populate project and token using locators
    await project.fill(envRelayProject)
    await token.fill(jwt)

    //await page.screenshot({ path: `screenshot_1.png` })

    // Click the connect button, which calls the connect function in the browser
    await page.click('#btnConnect')
    await expect(connectStatus).toHaveText('Connecting...')

    // How do I wait for connectStatus to contain "Connected" here?
    await expect(connectStatus).toHaveText('Connected')

    // Evaluate in the browser to gain access to the client, this can only happen after connect is called on the browser so the client exists
    await page.evaluate(async () => {
      const client = window.__client
      // Hook up client events? Won't we potentially miss some events if client.connect() has already been called in connect() from clicking the button?
      //await client.on('signalwire.ready', () => { console.log('Ready!') })
      // Can events hooked up here be to node functions outside of this page.evaluate callback function?
    })
    
    // How to make node side wait for browser side elements to change like when signalwire.ready is called?
  })
})
