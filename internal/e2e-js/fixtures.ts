import type {
  CallFabricRoomSession,
  SignalWireContract,
  Video,
} from '@signalwire/js'
import { PageWithWsInspector, intercepWsTraffic } from 'playwrigth-ws-inspector'
import { test as baseTest, expect, type Page } from '@playwright/test'
import {
  CreateRelayAppResourceParams,
  CreateSWMLAppResourceParams,
  Resource,
  createRelayAppResource,
  createSWMLAppResource,
  createVideoRoomResource,
  deleteResource,
  enablePageLogs,
} from './utils'

type CustomPage = Page & {
  swNetworkDown: () => Promise<void>
  swNetworkUp: () => Promise<void>
}
type CustomFixture = {
  createCustomPage(options: {
    name: string
  }): Promise<PageWithWsInspector<CustomPage>>
  createCustomVanillaPage(options: { name: string }): Promise<Page>
  resource: {
    createVideoRoomResource: typeof createVideoRoomResource
    createSWMLAppResource: typeof createSWMLAppResource
    createRelayAppResource: typeof createRelayAppResource
    resources: Resource[]
  }
}

const test = baseTest.extend<CustomFixture>({
  createCustomPage: async ({ context }, use) => {
    const maker = async (options: {
      name: string
    }): Promise<PageWithWsInspector<CustomPage>> => {
      let page = await context.newPage()
      enablePageLogs(page, options.name)
      //@ts-ignore
      page = await intercepWsTraffic(page)

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

    try {
      await use(maker)
    } finally {
      console.log('Cleaning up pages..')
      /**
       * If we have a __roomObj in the page means we tested the Video/Fabric APIs
       * so we must leave the room.
       * Invoke `.leave()` only if we have a valid `roomSessionId`.
       * Then double check the SDK elements got properly removed from the DOM.
       */
      const results = await Promise.all(
        context.pages().map((page) => {
          return page.evaluate(async () => {
            const roomObj: Video.RoomSession | CallFabricRoomSession =
              // @ts-expect-error
              window._roomObj
            console.log('Fixture roomObj', roomObj, roomObj.roomSessionId)
            if (roomObj) {
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

      /**
       * The Call Fabric SDK does not destory the client when the call is finished.
       * Make sure we cleanup the client as well.
       */
      await Promise.all(
        context.pages().map((page) => {
          return page.evaluate(async () => {
            return new Promise<void>((resolve, _reject) => {
              // @ts-expect-error
              const client: SignalWireContract = window._client
              console.log('Fixture client', client)
              if (!client) {
                resolve()
              }
              // @ts-expect-error
              client.__wsClient.clientApi.sessionEmitter.on(
                'session.disconnected',
                () => {
                  console.log('Client has been disconnected')
                  resolve()
                }
              )
              console.log('Disconnecting the client')
              client.disconnect()
            })
          })
        })
      )
    }
  },
  createCustomVanillaPage: async ({ context }, use) => {
    const maker = async (options: { name: string }): Promise<Page> => {
      const page = await context.newPage()
      enablePageLogs(page, options.name)
      return page
    }
    await use(maker)

    console.log('Cleaning up pages..')
  },
  resource: async ({}, use) => {
    const resources: Resource[] = []

    const resource = {
      createVideoRoomResource: async (params?: string) => {
        const data = await createVideoRoomResource(params)
        resources.push(data)
        return data
      },
      createSWMLAppResource: async (params: CreateSWMLAppResourceParams) => {
        const data = await createSWMLAppResource(params)
        resources.push(data)
        return data
      },
      createRelayAppResource: async (params: CreateRelayAppResourceParams) => {
        const data = await createRelayAppResource(params)
        resources.push(data)
        return data
      },
      resources,
    }

    try {
      await use(resource)
    } finally {
      console.log('Cleaning up resources..')
      // Clean up resources after use
      const deleteResources = resources.map(async (resource) => {
        try {
          await deleteResource(resource.id)
          console.log('Resource deleted successfully:', resource.id)
        } catch (error) {
          console.error('Failed to delete resource:', resource.id, error)
        }
      })
      await Promise.allSettled(deleteResources)
    }
  },
})

export { test, expect, Page }
