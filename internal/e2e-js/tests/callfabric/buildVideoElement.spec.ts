import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'

test.describe('buildVideoElement', () => {
  test('should not render any video if rootElement is not passed', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room without passing the rootElement
    await dialAddress(page, {
      address: `/public/${roomName}`,
      shouldPassRootElement: false,
    })

    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement).toBeNull()

    const overlayElement = await page.$('div[id^="sw-overlay-"] > video')
    expect(overlayElement).toBeNull()
  })

  test('should return the rootElement', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room without passing the rootElement
    await dialAddress(page, {
      address: `/public/${roomName}`,
      shouldPassRootElement: false,
    })

    // Build a video element
    const { element } = await page.evaluate(async () => {
      return new Promise<any>(async (resolve, _reject) => {
        // @ts-expect-error
        const call = window._roomObj
        // @ts-expect-error
        const { element } = await window._SWJS.buildVideoElement({
          room: call,
        })
        // @ts-expect-error
        window._element = element

        resolve({ element })
      })
    })

    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement).toBeNull()
    expect(element).not.toBeNull()

    await page.evaluate(() => {
      // @ts-expect-error
      const element = window._element
      document.body.appendChild(element)
      // @ts-expect-error
      delete window._element
    })

    await expectMCUVisible(page)

    const newVideoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(newVideoElement).not.toBeNull()
  })

  test('should render multiple video elements', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial and expect both video and member overlays
    await dialAddress(page, {
      address: `/public/${roomName}`,
    })

    await expectMCUVisible(page)

    await test.step('rootElement1: should have correct DOM elements and layerMap', async () => {
      const layerMapSize = await page.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(2)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(
        await page.$$('div#rootElement div[id^="sw-sdk-"] > video')
      ).toHaveLength(1)
      expect(
        await page.$$('div#rootElement div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      expect(layerMapSize).toBe(2)
    })

    // Create and expect only video overlay
    await page.evaluate(async () => {
      // @ts-expect-error
      const room = window._roomObj

      const rootElement = document.createElement('div')
      rootElement.id = 'rootElement2'
      document.body.appendChild(rootElement)

      // @ts-expect-error
      const { unsubscribe } = await window._SWJS.buildVideoElement({
        room,
        rootElement,
        applyMemberOverlay: false,
      })

      // @ts-expect-error
      window._unsubscribe = unsubscribe
    })

    await test.step('rootElement2: should have correct DOM elements and layerMap', async () => {
      const layerMapSize = await page.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(
        await page.$$('div#rootElement2 div[id^="sw-sdk-"] > video')
      ).toHaveLength(1)
      expect(
        await page.$$('div#rootElement2 div[id^="sw-overlay-"]')
      ).toHaveLength(0)
      expect(layerMapSize).toBe(1)
    })

    // Create and expect only member overlay
    await page.evaluate(async () => {
      // @ts-expect-error
      const room = window._roomObj

      // @ts-expect-error
      const { element } = await window._SWJS.buildVideoElement({
        room,
        applyLocalVideoOverlay: false,
      })

      const rootElement = document.createElement('div')
      rootElement.id = 'rootElement3'
      document.body.appendChild(rootElement)
      rootElement.append(element)
    })

    await test.step('rootElement3: should have correct DOM elements and layerMap', async () => {
      const layerMapSize = await page.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(4)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(
        await page.$$('div#rootElement3 div[id^="sw-sdk-"] > video')
      ).toHaveLength(0)
      expect(
        await page.$$('div#rootElement3 div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      expect(layerMapSize).toBe(1)
    })

    // Unsubscribe from the 2nd video element
    await page.evaluate(async () => {
      // @ts-expect-error
      const unsubscribe = window._unsubscribe
      unsubscribe()

      // @ts-expect-error
      delete window._unsubscribe
    })

    await test.step('unsubscribe2: should have correct DOM elements and layerMap', async () => {
      const layerMapSize = await page.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      // First element has both
      expect(
        await page.$$('div#rootElement div[id^="sw-sdk-"] > video')
      ).toHaveLength(1)
      expect(
        await page.$$('div#rootElement div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      // Second element is unsubsribed
      expect(
        await page.$$('div#rootElement2 div[id^="sw-sdk-"] > video')
      ).toHaveLength(0)
      expect(
        await page.$$('div#rootElement2 div[id^="sw-overlay-"]')
      ).toHaveLength(0)
      // Third element has member overlay only
      expect(
        await page.$$('div#rootElement3 div[id^="sw-sdk-"] > video')
      ).toHaveLength(0)
      expect(
        await page.$$('div#rootElement3 div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      expect(layerMapSize).toBe(0)
    })
  })

  test('should render the video even if the function is called before call.start', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

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

          const rootElement = document.createElement('div')
          rootElement.id = 'rootElement2'
          document.body.appendChild(rootElement)
          // @ts-expect-error
          await window._SWJS.buildVideoElement({
            room: call,
            rootElement,
          })

          await call.start()
        })
      },
      { roomName }
    )

    await expectMCUVisible(page)

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(4)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
  })

  test('should not create a new element if the elements are same', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Create and expect 1 video elements
    await page.evaluate(
      async ({ roomName }) => {
        return new Promise<void>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('room.joined', async () => {
            // @ts-expect-error
            await window._SWJS.buildVideoElement({
              room: call,
              rootElement: document.getElementById('rootElement'),
            })

            resolve()
          })

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    await expectMCUVisible(page)

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(2)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
  })

  test('should handle the element for multiple users', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page]' })
    await pageOne.goto(SERVER_URL)

    const pageTwo = await createCustomPage({ name: '[page]' })
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(pageOne)
    await createCFClient(pageTwo)

    // Dial an address and join a video room from pageOne
    await dialAddress(pageOne, {
      address: `/public/${roomName}`,
    })
    await expectMCUVisible(pageOne)

    await test.step('should have correct DOM elements and layerMap with one member', async () => {
      const layerMapSize = await pageOne.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(pageOne.locator('div.mcuLayers > *')).toHaveCount(2)
      expect(await pageOne.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageOne.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(layerMapSize).toBe(2)
    })

    // Dial an address and join a video room from pageTwo
    await dialAddress(pageTwo, {
      address: `/public/${roomName}`,
    })
    await expectMCUVisible(pageTwo)

    await test.step('should have correct DOM elements and layerMap with two members', async () => {
      const layerMapSizePageOne = await pageOne.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(pageOne.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await pageOne.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageOne.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(layerMapSizePageOne).toBe(3)

      const layerMapSizePageTwo = await pageTwo.evaluate<number>(() => {
        // @ts-expect-error
        return window._roomObj.layerMap.size
      })
      await expect(pageTwo.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await pageTwo.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageTwo.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(layerMapSizePageTwo).toBe(3)
    })
  })
})
