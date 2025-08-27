import { OverlayMap, LocalVideoOverlay } from '@signalwire/js'
import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectPageEvalToPass,
  randomizeRoomName,
  waitForFunction,
} from '../utils'

test.describe('buildVideoElement with CallFabric SDK', () => {
  const getOverlayMap = (page: Page) =>
    expectPageEvalToPass(page, {
      evaluateFn: () => {
        // @ts-expect-error
        return window._roomObj.overlayMap as OverlayMap
      },
      assertionFn: (overlayMap) => {
        expect(overlayMap).toBeDefined()
      },
      message: 'Expected overlayMap to be defined',
    })

  const getOverlayMapSize = (page: Page) =>
    expectPageEvalToPass(page, {
      evaluateFn: () => {
        // @ts-expect-error
        return (window._roomObj.overlayMap as OverlayMap).size
      },
      assertionFn: (overlayMapSize) => {
        expect(overlayMapSize).toBeDefined()
      },
      message: 'Expected overlayMap size to be defined',
    })

  const getLocalVideoOverlay = (page: Page) =>
    expectPageEvalToPass(page, {
      evaluateFn: () => {
        // @ts-expect-error
        return window._roomObj.localVideoOverlay as LocalVideoOverlay
      },
      assertionFn: (localVideoOverlay) => {
        expect(localVideoOverlay).toBeDefined()
      },
      message: 'Expected localVideoOverlay to be defined',
    })

  test('should not render any video if rootElement is not passed', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room without passing the rootElement
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      shouldPassRootElement: false,
    })

    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(0)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(0)
    expectPageEvalToPass(page, {
      evaluateFn: () => {
        return window._roomObj?.overlayMap as OverlayMap
      },
      assertionFn: (overlayMap) => {
        expect(overlayMap).toBeUndefined()
      },
      message: 'Expected overlayMap to be not defined',
    })
  })

  test('should return the rootElement', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room without passing the rootElement
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      shouldPassRootElement: false,
    })

    // Build a video element
    const element = await waitForFunction(page, {
      evaluateFn: () => {
        return new Promise<HTMLElement>(async (resolve, _reject) => {
          const call = window._roomObj
          if (!call) {
            throw new Error('Room object is not defined')
          }
          const { element } = await window._SWJS.buildVideoElement({
            room: call,
          })
          resolve(element)
        })
      },
      message: 'Expected built HTMLElement to be defined',
    })

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(0)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(0)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(0)
    expect(await getOverlayMap(page)).toBeDefined()
    // The size depends on the layout.changed has been received yet or not
    expect(await getOverlayMapSize(page)).toBeGreaterThanOrEqual(1)
    expect(await getLocalVideoOverlay(page)).toBeDefined()

    await expectPageEvalToPass(page, {
      evaluateArgs: element,
      evaluateFn: (element) => {
        document.body.appendChild(element)
        return true
      },
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected to append element to DOM',
    })

    await expectMCUVisible(page)

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(2)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
    expect(await getOverlayMap(page)).toBeDefined()
    expect(await getOverlayMapSize(page)).toBe(2)
    expect(await getLocalVideoOverlay(page)).toBeDefined()
  })

  test('should render multiple video elements', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial and expect both video and member overlays
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    await expectMCUVisible(page)

    await test.step('rootElement1: should have correct DOM elements and overlayMap', async () => {
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(2)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(
        await page.$$('div#rootElement div[id^="sw-sdk-"] > video')
      ).toHaveLength(1)
      expect(
        await page.$$('div#rootElement div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      expect(await getOverlayMapSize(page)).toBe(2)
      expect(await getLocalVideoOverlay(page)).toBeDefined()
    })

    // Create and expect only video overlay
    const unsubscribe = await waitForFunction(page, {
      evaluateFn: async () => {
        const room = window._roomObj
        if (!room) {
          throw new Error('Room object is not defined')
        }
        const rootElement = document.createElement('div')
        rootElement.id = 'rootElement2'
        document.body.appendChild(rootElement)

        const { unsubscribe } = await window._SWJS.buildVideoElement({
          room,
          rootElement,
          applyMemberOverlay: false,
        })
        return unsubscribe
      },
      message: 'Expected to create second video element',
    })

    await test.step('rootElement2: should have correct DOM elements and overlayMap', async () => {
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(
        await page.$$('div#rootElement2 div[id^="sw-sdk-"] > video')
      ).toHaveLength(1)
      expect(
        await page.$$('div#rootElement2 div[id^="sw-overlay-"]')
      ).toHaveLength(0)
      expect(await getOverlayMapSize(page)).toBe(1)
      expect(await getLocalVideoOverlay(page)).toBeDefined()
    })

    // Create and expect only member overlay
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const room = window._roomObj
        if (!room) {
          throw new Error('Room object is not defined')
        }
        const { element } = await window._SWJS.buildVideoElement({
          room,
          applyLocalVideoOverlay: false,
        })

        const rootElement = document.createElement('div')
        rootElement.id = 'rootElement3'
        document.body.appendChild(rootElement)
        rootElement.append(element)
        return true
      },
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected to create third (member-only) overlay',
    })

    await test.step('rootElement3: should have correct DOM elements and overlayMap', async () => {
      await expect(page.locator('div.mcuLayers > *')).toHaveCount(4)
      expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
      expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(
        await page.$$('div#rootElement3 div[id^="sw-sdk-"] > video')
      ).toHaveLength(0)
      expect(
        await page.$$('div#rootElement3 div[id^="sw-overlay-"]')
      ).toHaveLength(1)
      expect(await getOverlayMapSize(page)).toBe(1)
      expect(await getLocalVideoOverlay(page)).toBeDefined()
      expect((await getLocalVideoOverlay(page)).domElement).not.toBeDefined()
    })

    // Unsubscribe from the 2nd video element
    await expectPageEvalToPass(page, {
      evaluateArgs: { unsubscribe },
      evaluateFn: async ({ unsubscribe }) => {
        unsubscribe()
        return true
      },
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected to unsubscribe second video element',
    })

    await test.step('unsubscribe2: should have correct DOM elements and overlayMap', async () => {
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
      expect(await getOverlayMapSize(page)).toBe(0)
      expect(await getLocalVideoOverlay(page)).toBeDefined()
      expect((await getLocalVideoOverlay(page)).domElement).not.toBeDefined()
    })
  })

  test('should render the video even if the function is called before call.start', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Create a video element
    await expectPageEvalToPass(page, {
      evaluateArgs: roomName,
      evaluateFn: (roomName) => {
        return new Promise(async (resolve, _reject) => {
          const client = window._client
          if (!client) {
            throw new Error('Client is not defined')
          }

          const call = await client.dial({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('room.joined', resolve)

          window._roomObj = call

          const rootElement = document.createElement('div')
          rootElement.id = 'rootElement2'
          document.body.appendChild(rootElement)

          await window._SWJS.buildVideoElement({
            room: call,
            rootElement,
          })

          await call.start()
        })
      },
      assertionFn: (ok) => {
        expect(ok).toBeDefined()
      },
      message: 'Expected to create video element before room.joined',
    })

    await expectMCUVisible(page)

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(4)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(2)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
    expect(await getOverlayMap(page)).toBeDefined()
    expect(await getOverlayMapSize(page)).toBe(2)
    expect(await getLocalVideoOverlay(page)).toBeDefined()
  })

  test('should not create a new element if the elements are same', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)
    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room with rootElement
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    // Create a video element with the same rootElement
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const room = window._roomObj
        if (!room) {
          throw new Error('Room object is not defined')
        }

        const rootElement = document.getElementById('rootElement')
        if (!rootElement) {
          throw new Error('Root element is not defined')
        }

        await window._SWJS.buildVideoElement({
          room,
          rootElement,
        })
        return true
      },
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected to build video element with same rootElement',
    })

    await expectMCUVisible(page)

    await expect(page.locator('div.mcuLayers > *')).toHaveCount(2)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
    expect(await getOverlayMap(page)).toBeDefined()
    expect(await getOverlayMapSize(page)).toBe(2)
    expect(await getLocalVideoOverlay(page)).toBeDefined()
  })

  test('should handle the element for multiple users', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const roomName = randomizeRoomName('bld-vd-el')
    await resource.createVideoRoomResource(roomName)

    await Promise.all([createCFClient(pageOne), createCFClient(pageTwo)])

    // Dial an address and join a video room from pageOne
    await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=video`,
    })
    await expectMCUVisible(pageOne)

    await test.step('should have correct DOM elements and overlayMap with one member', async () => {
      await expect(pageOne.locator('div.mcuLayers > *')).toHaveCount(2)
      expect(await pageOne.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageOne.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(await getOverlayMapSize(pageOne)).toBe(2)
      expect(await getLocalVideoOverlay(pageOne)).toBeDefined()
    })

    // Dial an address and join a video room from pageTwo
    await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=video`,
    })
    await expectMCUVisible(pageTwo)

    await test.step('should have correct DOM elements and overlayMap with two members', async () => {
      await expect(pageOne.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await pageOne.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageOne.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(await getOverlayMapSize(pageOne)).toBe(3)
      expect(await getLocalVideoOverlay(pageOne)).toBeDefined()

      await expect(pageTwo.locator('div.mcuLayers > *')).toHaveCount(3)
      expect(await pageTwo.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageTwo.$$('div[id^="sw-overlay-"]')).toHaveLength(2)
      expect(await getOverlayMapSize(pageTwo)).toBe(3)
      expect(await getLocalVideoOverlay(pageTwo)).toBeDefined()
    })

    await test.step('should return the element with getMemberOverlay', async () => {
      const memberOneId = await expectPageEvalToPass(pageOne, {
        evaluateFn: () => {
          return window._roomObj?.memberId
        },
        assertionFn: (id) => expect(id).toBeDefined(),
        message: 'Expected memberOneId to be defined',
      })
      const memberTwoId = await expectPageEvalToPass(pageTwo, {
        evaluateFn: () => {
          return window._roomObj?.memberId
        },
        assertionFn: (id) => expect(id).toBeDefined(),
        message: 'Expected memberTwoId to be defined',
      })

      await expectPageEvalToPass(pageOne, {
        evaluateArgs: { memberOneId, memberTwoId },
        evaluateFn: ({ memberOneId, memberTwoId }) => {
          const room = window._roomObj
          return [
            room?.getMemberOverlay(memberOneId!),
            room?.getMemberOverlay(memberTwoId!),
          ]
        },
        assertionFn: ([el1, el2]) => {
          expect(el1).toBeDefined()
          expect(el2).toBeDefined()
        },
        message: 'Expected member overlay elements to be defined',
      })
    })
  })
})
