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
      console.error(`Test Runner ${name} Passed!`)
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
