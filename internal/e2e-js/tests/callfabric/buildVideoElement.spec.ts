import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient, expectMCUVisible } from '../../utils'

test.describe('buildVideoElement', () => {
  test('should not render any video if rootElement is not passed', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = 'cf-e2e-test-room'

    await createCFClient(page)

    // Dial an address and join a video room
    await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
          })

          call.on('room.joined', resolve)

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement).toBeNull()
  })

  test('should return the rootElement', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = 'cf-e2e-test-room'

    await createCFClient(page)

    // Dial an address and join a video room
    const { element } = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
          })

          // @ts-expect-error
          window._roomObj = call

          await call.start()

          // @ts-expect-error
          const { element } = await window._SWJS.buildVideoElement({
            room: call,
          })

          resolve({ element })
        })
      },
      { roomName }
    )

    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement).toBeNull()
    expect(element).not.toBeNull()
  })

  test('should render multiple video elements', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = 'cf-e2e-test-room'

    await createCFClient(page)

    // Create and expect 1 video elements
    await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('room.joined', resolve)

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    await expectMCUVisible(page)

    const videoElements1 = await page.$$('div[id^="sw-sdk-"] > video')
    expect(videoElements1).toHaveLength(1)

    // Create and expect 2 video elements
    await page.evaluate(async () => {
      // @ts-expect-error
      const room = window._roomObj

      const rootElement = document.createElement('div')
      rootElement.id = 'rootElement1'
      document.body.appendChild(rootElement)

      // @ts-expect-error
      const { unsubscribe } = await window._SWJS.buildVideoElement({
        room,
        rootElement,
      })

      // @ts-expect-error
      window._unsubscribe = unsubscribe
    })

    const videoElements2 = await page.$$('div[id^="sw-sdk-"] > video')
    expect(videoElements2).toHaveLength(2)

    // Create and expect 3 video elements
    await page.evaluate(async () => {
      // @ts-expect-error
      const room = window._roomObj

      // @ts-expect-error
      const { element } = await window._SWJS.buildVideoElement({
        room,
      })

      const rootElement = document.createElement('div')
      rootElement.id = 'rootElement2'
      document.body.appendChild(rootElement)
      rootElement.append(element)
    })

    const videoElements3 = await page.$$('div[id^="sw-sdk-"] > video')
    expect(videoElements3).toHaveLength(3)

    // Unsubsribe from the 2nd video element and expect 2 video elements
    await page.evaluate(async () => {
      // @ts-expect-error
      const unsubscribe = window._unsubscribe
      unsubscribe()

      // @ts-expect-error
      delete window._unsubscribe
    })

    const videoElements4 = await page.$$('div[id^="sw-sdk-"] > video')
    expect(videoElements4).toHaveLength(2)
  })
})
