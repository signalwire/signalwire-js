import type { Video } from '@signalwire/js'
import { test as baseTest, expect, type Page } from '@playwright/test'
import { enablePageLogs } from './utils'

type CustomFixture = {
  createCustomPage(options: { name: string }): Promise<Page>
}

const test = baseTest.extend<CustomFixture>({
  createCustomPage: async ({ context }, use) => {
    const maker = async (options: { name: string }) => {
      const page = await context.newPage()
      enablePageLogs(page, options.name)

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
            rootEl: document.getElementById('rootElement')!.childElementCount,
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
