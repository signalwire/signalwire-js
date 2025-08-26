import { OverlayMap, LocalVideoOverlay } from '@signalwire/js'
import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectPageEvalToPass,
  expectRoomJoinWithDefaults,
  randomizeRoomName,
  waitForFunction,
} from '../utils'

test.describe('buildVideoElement with Video SDK', () => {
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

  const createRoomSession = (page: Page, options: any) => {
    return createTestRoomSession(page, {
      vrt: {
        room_name: options.roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.list_available_layouts'],
      },
      initialEvents: [
        'layout.changed',
        'track',
        'destroy',
        'member.joined',
        'member.left',
        'member.updated',
        'member.updated.video_muted',
      ],
      ...options,
    })
  }

  test('should not render any video if rootElement is not passed', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('bld-vd-el')

    await createRoomSession(page, {
      roomName,
      shouldPassRootElement: false,
    })

    // Join a video room without passing the rootElement
    await expectRoomJoinWithDefaults(page)

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

  test('should return the rootElement', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('bld-vd-el')

    await createRoomSession(page, {
      roomName,
      shouldPassRootElement: false,
    })

    // Join a video room without passing the rootElement
    await expectRoomJoinWithDefaults(page)

    // Build a video element
    const element = await waitForFunction(page, () => {
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
    })
    expect(element, {
      message: 'Expected built HTMLElement to be defined',
    }).toBeDefined()

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
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('bld-vd-el')

    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.list_available_layouts'],
      },
      initialEvents: [
        'layout.changed',
        'track',
        'destroy',
        'member.joined',
        'member.left',
        'member.updated',
        'member.updated.video_muted',
      ],
    })

    // Join a video room and expect both video and member overlays
    await expectRoomJoinWithDefaults(page)

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
    const unsubscribe = await waitForFunction(
      page,
      async () => {
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
      undefined,
      {
        message: 'Expected to create second video element',
      }
    )

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

  test('should render the video even if the function is called before room.join', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('bld-vd-el')

    await createRoomSession(page, { roomName })

    // Create a video element
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const room = window._roomObj
        if (!room) {
          throw new Error('Room object is not defined')
        }
        const rootElement = document.createElement('div')
        rootElement.id = 'rootElement2'
        document.body.appendChild(rootElement)
        await window._SWJS.buildVideoElement({
          room,
          rootElement,
        })
        return true
      },
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected to create video element before room.joined',
    })

    // Join a video room
    await expectRoomJoinWithDefaults(page)

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
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('bld-vd-el')

    await createRoomSession(page, { roomName })

    // Join a video room with rootElement
    await expectRoomJoinWithDefaults(page)
    await expectRoomJoinWithDefaults(page)

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
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const roomName = randomizeRoomName('bld-vd-el')

    await createRoomSession(pageOne, { roomName })

    // Join a video room from pageOne
    await expectRoomJoinWithDefaults(pageOne)
    await expectMCUVisible(pageOne)

    await test.step('should have correct DOM elements and overlayMap with one member', async () => {
      await expect(pageOne.locator('div.mcuLayers > *')).toHaveCount(2)
      expect(await pageOne.$$('div[id^="sw-sdk-"] > video')).toHaveLength(1)
      expect(await pageOne.$$('div[id^="sw-overlay-"]')).toHaveLength(1)
      expect(await getOverlayMapSize(pageOne)).toBe(2)
      expect(await getLocalVideoOverlay(pageOne)).toBeDefined()
    })

    await createRoomSession(pageTwo, { roomName })

    // Join a video room from pageTwo
    await expectRoomJoinWithDefaults(pageTwo)
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
