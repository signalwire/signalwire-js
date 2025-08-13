import { PageWithWsInspector, intercepWsTraffic } from 'playwrigth-ws-inspector'
import { test as baseTest, expect, type Page } from '@playwright/test'
import { fork, ChildProcess } from 'child_process'
import * as path from 'path'
import {
  CreatecXMLScriptParams,
  CreateRelayAppResourceParams,
  CreateSWMLAppResourceParams,
  Resource,
  createcXMLExternalURLResource,
  createcXMLScriptResource,
  createRelayAppResource,
  createSWMLAppResource,
  createVideoRoomResource,
  deleteResource,
  disconnectClient,
  enablePageLogs,
  leaveRoom,
  CreatecXMLExternalURLParams,
} from './utils'

type CustomPage = Page & {
  swNetworkDown: () => Promise<void>
  swNetworkUp: () => Promise<void>
}

interface RelayAppClient {
  start: (command: string, params: any) => Promise<void>
  stop: () => Promise<void>
  stopPlayback: (playbackId: string) => Promise<void>
  waitForEvent: (eventType: string, timeout?: number) => Promise<any>
  process: ChildProcess | null
}

type CustomFixture = {
  createCustomPage(options: {
    name: string
  }): Promise<PageWithWsInspector<CustomPage>>
  createCustomVanillaPage(options: { name: string }): Promise<Page>
  relayAppClient: RelayAppClient
  resource: {
    createcXMLExternalURLResource: typeof createcXMLExternalURLResource
    createcXMLScriptResource: typeof createcXMLScriptResource
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
       * If we have a __callObj in the page means we tested the Call APIs
       * so we must leave the room.
       * Invoke `.leave()` only if we have a valid `roomSessionId`.
       * Then double check the SDK elements got properly removed from the DOM.
       */
      const results = await Promise.all(context.pages().map(leaveRoom))
      results.forEach((row) => {
        expect(row.videos).toBe(0)
        expect(row.rootEl).toBe(0)
      })

      /**
       * The Call SDK does not destroy the client when the call is finished.
       * Make sure we cleanup the client as well.
       */
      await Promise.all(context.pages().map(disconnectClient))
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
  relayAppClient: async ({}, use) => {
    let childProcess: ChildProcess | null = null
    const eventListeners = new Map<string, Array<(data: any) => void>>()

    const client: RelayAppClient = {
      start: async (command: string, params: any) => {
        return new Promise((resolve, reject) => {
          const workerPath = path.join(__dirname, 'relayAppWorker.js')
          childProcess = fork(workerPath, [command, JSON.stringify(params)], {
            silent: false,
            env: process.env
          })

          childProcess.on('error', (error) => {
            console.error('RelayApp process error:', error)
            reject(error)
          })

          childProcess.on('message', (msg: any) => {
            console.log('RelayApp message:', msg)

            const listeners = eventListeners.get(msg.type) || []
            listeners.forEach(listener => listener(msg))

            if (msg.type === 'error') {
              reject(new Error(msg.error))
            }
          })

          // Consider the process started once it's spawned
          setTimeout(() => resolve(), 1000)
        })
      },
      stop: async () => {
        if (childProcess) {
          childProcess.send({ type: 'disconnect' })
          await new Promise<void>((resolve) => {
            childProcess!.on('exit', () => resolve())
            setTimeout(() => {
              childProcess!.kill('SIGTERM')
              resolve()
            }, 5000)
          })
          childProcess = null
        }
      },
      stopPlayback: async (id: string) => {
        if (childProcess && id) {
          return new Promise<void>((resolve) => {
            const listener = (msg: any) => {
              if (msg.type === 'playbackStopped') {
                const listeners = eventListeners.get('playbackStopped') || []
                const index = listeners.indexOf(listener)
                if (index > -1) listeners.splice(index, 1)
                resolve()
              }
            }
            const listeners = eventListeners.get('playbackStopped') || []
            listeners.push(listener)
            eventListeners.set('playbackStopped', listeners)
            
            childProcess!.send({ type: 'stopPlayback', playbackId: id })
          })
        }
      },
      waitForEvent: async (eventType: string, timeout = 30000) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${eventType}`))
          }, timeout)

          const listener = (data: any) => {
            clearTimeout(timer)
            const listeners = eventListeners.get(eventType) || []
            const index = listeners.indexOf(listener)
            if (index > -1) listeners.splice(index, 1)
            resolve(data)
          }

          const listeners = eventListeners.get(eventType) || []
          listeners.push(listener)
          eventListeners.set(eventType, listeners)
        })
      },
      process: childProcess
    }

    try {
      await use(client)
    } finally {
      console.log('Cleaning up relay app client...')
      if (childProcess) {
        childProcess.kill('SIGTERM')
      }
    }
  },
  resource: async ({}, use) => {
    const resources: Resource[] = []

    const resource = {
      createVideoRoomResource: async (params?: string) => {
        const data = await createVideoRoomResource(params)
        resources.push(data)
        return data
      },
      createcXMLExternalURLResource: async (
        params: CreatecXMLExternalURLParams
      ) => {
        const data = await createcXMLExternalURLResource(params)
        resources.push(data)
        return data
      },
      createcXMLScriptResource: async (params: CreatecXMLScriptParams) => {
        const data = await createcXMLScriptResource(params)
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
