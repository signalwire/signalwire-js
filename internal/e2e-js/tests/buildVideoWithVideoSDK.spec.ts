import { OverlayMap, LocalVideoOverlay, VideoRoomSession } from '@signalwire/js'
import { test, expect, Page } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  expectRoomJoinWithDefaults,
  randomizeRoomName,
} from '../utils'

test.describe('buildVideoElement with Video SDK', () => {
  const getOverlayMap = (page: Page) =>
    page.evaluate<OverlayMap>(() => {
      // @ts-expect-error
      return window._roomObj.overlayMap
    })

  const getOverlayMapSize = (page: Page) =>
    page.evaluate<number>(() => {
      // @ts-expect-error
      return window._roomObj.overlayMap.size
    })

  const getLocalVideoOverlay = (page: Page) =>
    page.evaluate<LocalVideoOverlay>(() => {
      // @ts-expect-error
      return window._roomObj.localVideoOverlay
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
    expect(await getOverlayMap(page)).toBeUndefined()
    expect(await getLocalVideoOverlay(page)).toBeUndefined()
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

    expect(element).toBeDefined()
    await expect(page.locator('div.mcuLayers > *')).toHaveCount(0)
    expect(await page.$$('div[id^="sw-sdk-"] > video')).toHaveLength(0)
    expect(await page.$$('div[id^="sw-overlay-"]')).toHaveLength(0)
    expect(await getOverlayMap(page)).toBeDefined()
    // The size depends on the layout.changed has been received yet or not
    expect(await getOverlayMapSize(page)).toBeGreaterThanOrEqual(1)
    expect(await getLocalVideoOverlay(page)).toBeDefined()

    await page.evaluate(() => {
      // @ts-expect-error
      const element = window._element
      document.body.appendChild(element)
      // @ts-expect-error
      delete window._element
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
    await page.evaluate(async () => {
      // @ts-expect-error
      const unsubscribe = window._unsubscribe
      unsubscribe()

      // @ts-expect-error
      delete window._unsubscribe
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
    await page.evaluate(async () => {
      // @ts-expect-error
      const room = window._roomObj
      const rootElement = document.createElement('div')
      rootElement.id = 'rootElement2'
      document.body.appendChild(rootElement)
      // @ts-expect-error
      await window._SWJS.buildVideoElement({
        room,
        rootElement,
      })
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
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      // @ts-expect-error
      await window._SWJS.buildVideoElement({
        room: call,
        rootElement: document.getElementById('rootElement'),
      })
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
      const memberOneId = await pageOne.evaluate(() => {
        // @ts-expect-error
        return window._roomObj.memberId
      })
      const memberTwoId = await pageTwo.evaluate(() => {
        // @ts-expect-error
        return window._roomObj.memberId
      })
      expect(memberOneId).toBeDefined()
      expect(memberTwoId).toBeDefined()

      const [memberOneElement, memberTwoElement] = await pageOne.evaluate(
        ({ memberOneId, memberTwoId }) => {
          // @ts-expect-error
          const room: VideoRoomSession = window._roomObj

          return [
            room.getMemberOverlay(memberOneId),
            room.getMemberOverlay(memberTwoId),
          ]
        },
        { memberOneId, memberTwoId }
      )

      expect(memberOneElement).toBeDefined()
      expect(memberTwoElement).toBeDefined()
    })
  })
})
