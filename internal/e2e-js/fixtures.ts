import type { Video } from '@signalwire/js'
import { test as baseTest, expect, type Page } from '@playwright/test'
import { enablePageLogs } from './utils'

type CustomPage = Page & {
  swNetworkDown: () => Promise<void>
  swNetworkUp: () => Promise<void>
}
type CustomFixture = {
  createCustomPage(options: { name: string }): Promise<CustomPage>
}

const test = baseTest.extend<CustomFixture>({
  createCustomPage: async ({ context }, use) => {
    const maker = async (options: { name: string }): Promise<CustomPage> => {
      const page = await context.newPage()
      enablePageLogs(page, options.name)

      // @ts-expect-error
      page.swNetworkDown = () => {
        console.log('Simulate network down..')
        return context.setOffline(true)
      }
      // @ts-expect-error
      page.swNetworkUp = () => {
        console.log('Simulate network up..')
        return context.setOffline(false)
      }
      // @ts-expect-error
      return page
    }
    await use(maker)

    console.log('Cleaning up pages..')

    /**
     * If we have a __roomObj in the page means we tested the VideoAPI
     * so we must leave the room.
     * Invoke `.leave()` only if we have a valid `roomSessionId`.
     * Then double check the SDK elements got properly removed from the DOM.
     */
    const results = await Promise.all(
      context.pages().map((page) => {
        return page.evaluate(async () => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          if (roomObj && roomObj.roomSessionId) {
            console.log('Fixture has room', roomObj.roomSessionId)
            await roomObj.leave()
          }

          return {
            videos: Array.from(document.querySelectorAll('video')).length,
            rootEl:
              document.getElementById('rootElement')?.childElementCount ?? 0,
          }
        })
      })
    )

    results.forEach((row) => {
      expect(row.videos).toBe(0)
      expect(row.rootEl).toBe(0)
    })
  },
})

export { test, expect }
