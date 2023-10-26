import { request } from 'node:https'
import { randomUUID, randomBytes } from 'node:crypto'

/**
 * 10 seconds to execute the script by default
 */
const MAX_EXECUTION_TIME = 10_000

interface DomainApp {
  type: 'domain_application'
  id: string
  name: string
  domain: string
  identifier: string
  ip_auth_enabled: boolean
  ip_auth: string[]
  call_handler: 'relay_context'
  call_request_url: string | null
  call_request_method: string
  call_fallback_url: string | null
  call_fallback_method: string
  call_status_callback_url: string | null
  call_status_callback_method: string
  call_relay_context: string
  call_laml_application_id: string | null
  call_video_room_id: string | null
  call_relay_script_url: string | null
  encryption: 'optional'
  codecs: ('PCMU' | 'PCMA')[]
  ciphers: string[]
}
interface TestHandlerParams {
  domainApp?: DomainApp
}

export type TestHandler =
  | (() => Promise<number>)
  | ((params: TestHandlerParams) => Promise<number>)

interface CreateTestRunnerParams {
  uuid?: string
  name: string
  testHandler: TestHandler
  executionTime?: number
  useDomainApp?: boolean
}

export const createTestRunner = ({
  uuid = randomUUID(),
  name,
  testHandler,
  executionTime = MAX_EXECUTION_TIME,
  useDomainApp = false,
}: CreateTestRunnerParams) => {
  let timer: ReturnType<typeof setTimeout>

  const start = () => {
    timer = setTimeout(() => {
      console.error(`Test Runner ${name} ran out of time (${executionTime})`)
      process.exit(2)
    }, executionTime)
  }

  const done = (exitCode: number) => {
    clearTimeout(timer)
    if (exitCode === 0) {
      console.log(`Test Runner ${name} Passed!`)
    } else {
      console.log(`Test Runner ${name} finished with exitCode: ${exitCode}`)
    }
    process.exit(exitCode)
  }

  return {
    run: async () => {
      start()

      const params: TestHandlerParams = {}
      try {
        if (useDomainApp) {
          params.domainApp = await createDomainApp({
            name: `d-app-${uuid}`,
            identifier: uuid,
            call_handler: 'relay_context',
            call_relay_context: `d-app-ctx-${uuid}`,
          })
        }
        const exitCode = await testHandler(params)
        if (params.domainApp) {
          console.log('Delete domain app..')
          await deleteDomainApp({ id: params.domainApp.id })
          delete params.domainApp
        }
        done(exitCode)
      } catch (error) {
        clearTimeout(timer)
        console.error(`Test Runner ${name} Failed!`, error)
        if (params.domainApp) {
          console.log('Delete domain app..')
          await deleteDomainApp({ id: params.domainApp.id })
          delete params.domainApp
        }
        done(1)
      }
    },
  }
}

export const getAuthorization = () => {
  const auth = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  return 'Basic ' + Buffer.from(auth).toString('base64')
}

type CreateCRTParams = {
  memberId: string
  channels: Record<string, Partial<Record<'read' | 'write', boolean>>>
}
export const createCRT = ({
  memberId,
  channels,
}: CreateCRTParams): Promise<string> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      ttl: 120,
      member_id: memberId,
      state: {
        displayName: 'E2E Tester',
      },
      channels: channels,
    })
    const options = {
      host: process.env.API_HOST,
      port: 443,
      method: 'POST',
      path: '/api/chat/tokens',
      headers: {
        Authorization: getAuthorization(),
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }
    // console.log('CRT options', options)
    const req = request(options, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('end', () => {
        resolve(JSON.parse(body))
      })
    })

    req.on('error', reject)

    req.write(data)
    req.end()
  })
}

export const sessionStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem(key: string) {
      return store[key] || null
    },
    setItem(key: string, value: string) {
      store[key] = value.toString()
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
}

export const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

export const makeSipDomainAppAddress = ({ name, domain }) => {
  return `sip:${name}-${randomBytes(16).toString('hex')}@${domain}.${
    process.env.DAPP_DOMAIN
  }`
}

type CreateDomainAppParams = {
  name: string
  identifier: string
  call_handler: 'relay_context'
  call_relay_context: string
}
const createDomainApp = (params: CreateDomainAppParams): Promise<DomainApp> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params)
    const options = {
      host: process.env.API_HOST,
      port: 443,
      method: 'POST',
      path: '/api/relay/rest/domain_applications',
      headers: {
        Authorization: getAuthorization(),
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }
    const req = request(options, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('end', () => {
        resolve(JSON.parse(body))
      })
    })

    req.on('error', reject)

    req.write(data)
    req.end()
  })
}

type DeleteDomainAppParams = {
  id: string
}
const deleteDomainApp = ({ id }: DeleteDomainAppParams): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const options = {
      host: process.env.API_HOST,
      port: 443,
      method: 'DELETE',
      path: `/api/relay/rest/domain_applications/${id}`,
      headers: {
        Authorization: getAuthorization(),
        'Content-Type': 'application/json',
      },
    }
    const req = request(options, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('end', () => {
        resolve()
      })
    })
    req.on('error', reject)
    req.end()
  })
}
