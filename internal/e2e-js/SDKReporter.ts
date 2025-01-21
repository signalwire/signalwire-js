import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
  TestError,
  TestStep,
} from '@playwright/test/reporter'

/**
 * A custom SDK reporter that implements Playwright Reporter interface methods.
 */
export default class SDKReporter implements Reporter {
  private totalTests = 0
  private completedTests = 0
  private failedTests = 0
  private passedTests = 0
  private skippedTests = 0
  private timedOutTests = 0

  /**
   * Called once before running tests.
   */
  onBegin(_config: FullConfig, suite: Suite): void {
    this.totalTests = suite.allTests().length
    console.log('============================================')
    console.log(`Starting the run with ${this.totalTests} tests...`)
    console.log('============================================')
  }

  /**
   * Called after all tests have run, or the run was interrupted.
   */
  async onEnd(result: FullResult): Promise<void> {
    console.log('\n\n')
    console.log('============================================')
    console.log(`Test run finished with status: ${result.status.toUpperCase()}`)
    console.log('--------------------------------------------')
    console.log(`Total Tests:    ${this.totalTests}`)
    console.log(`Passed:         ${this.passedTests}`)
    console.log(`Failed:         ${this.failedTests}`)
    console.log(`Skipped:        ${this.skippedTests}`)
    console.log(`Timed Out:      ${this.timedOutTests}`)
    console.log('============================================')
    console.log('\n\n')
  }

  /**
   * Called on a global error, for example an unhandled exception in the test.
   */
  onError(error: TestError): void {
    console.log('============================================')
    console.log(`Global Error: ${error.message}`)
    console.log(error)
    console.log('============================================')
  }

  /**
   * Called immediately before the test runner exits, after onEnd() and all
   * reporters have finished.
   * If required: upload logs to a server here.
   */
  async onExit(): Promise<void> {
    console.log('[SDKReporter] Exit')
  }

  /**
   * Called when a test step (i.e., `test.step(...)`) begins in the worker.
   */
  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep): void {
    /**
     * Playwright creates some internal steps as well.
     * We do not care about those steps.
     * We only log our own custom test steps.
     */
    if (step.category === 'test.step') {
      console.log(`--- STEP BEGIN: "${step.title}"`)
    }
  }

  /**
   * Called when a test step finishes.
   */
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.category === 'test.step') {
      if (step.error) {
        console.log(`--- STEP FAILED: "${step.title}"`)
        console.log(step.error)
      } else {
        console.log(`--- STEP FINISHED: "${step.title}"`)
      }
    }
  }

  /**
   * Called when a test begins in the worker process.
   */
  onTestBegin(test: TestCase, _result: TestResult): void {
    console.log('--------------------------------------------')
    console.log(`⏯️ Test Started: ${test.title}`)
    console.log('--------------------------------------------')
  }

  /**
   * Called when a test ends (pass, fail, timeout, etc.).
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    console.log('--------------------------------------------')
    this.completedTests += 1
    switch (result.status) {
      case 'passed':
        this.passedTests += 1
        console.log(`✅ Test Passed: ${test.title}`)
        break
      case 'failed':
        this.failedTests += 1
        console.log(`❌ Test Failed: ${test.title}`)
        if (result.error) {
          console.log(`📧 Error: ${result.error.message}`)
          if (result.error.stack) {
            console.log(`📚 Stack: ${result.error.stack}`)
          }
        }
        break
      case 'timedOut':
        this.timedOutTests += 1
        console.log(`⏰ Test Timed Out: ${test.title}`)
        break
      case 'skipped':
        this.skippedTests += 1
        console.log(`↩️ Test Skipped: ${test.title}`)
        break
      default:
        console.log(`Test Ended with status "${result.status}": ${test.title}`)
        break
    }
    console.log('--------------------------------------------')
    console.log('\n\n')
  }

  /**
   * Indicates this reporter does not handle stdout and stderr printing.
   * So that Playwright print those logs.
   */
  printsToStdio(): boolean {
    return false
  }
}
