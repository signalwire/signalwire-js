import { request } from 'https'

/**
 * 10 seconds to execute the script by default
 */
const MAX_EXECUTION_TIME = 10_000

interface CreateTestRunnerParams {
  name: string
  testHandler(): Promise<number>
  executionTime?: number
}

export const createTestRunner = ({
  name,
  testHandler,
  executionTime = MAX_EXECUTION_TIME,
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

      try {
        const exitCode = await testHandler()
        done(exitCode)
      } catch (error) {
        clearTimeout(timer)
        console.error(`Test Runner ${name} Failed!`, error)
        done(1)
      }
    },
  }
}

const getAuthorization = () => {
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
