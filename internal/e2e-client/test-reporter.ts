import { Reporter, TestCase, TestResult, TestError } from '@playwright/test/reporter'

class TestNameReporter implements Reporter {
  printsToStdio() {
    return false
  }
  
  onTestBegin(test: TestCase) {
    const timestamp = new Date().toISOString()
    console.log('\n' + '='.repeat(80))
    console.log(`TEST STARTING: ${timestamp}`)
    console.log(`FILE: ${test.location.file}`)
    console.log(`TITLE: ${test.title}`)
    console.log(`FULL NAME: ${test.titlePath().join(' > ')}`)
    console.log(`TIMEOUT: ${test.timeout}ms`)
    console.log('='.repeat(80) + '\n')
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const timestamp = new Date().toISOString()
    const status = result.status
    const duration = result.duration
    console.log('\n' + '-'.repeat(80))
    console.log(`TEST COMPLETED: ${timestamp}`)
    console.log(`STATUS: ${status.toUpperCase()}`)
    console.log(`DURATION: ${duration}ms`)
    console.log(`TITLE: ${test.title}`)
    
    // Log error details for failed tests
    if (status === 'failed' && result.errors.length > 0) {
      console.log('\nERROR DETAILS:')
      result.errors.forEach((error: TestError, index: number) => {
        console.log(`\nError ${index + 1}:`)
        console.log(`Message: ${error.message || 'No message'}`)
        
        // Extract enhanced error information
        if (error.message?.includes('page.evaluate')) {
          console.log('TYPE: page.evaluate error')
          
          // Check for timeout
          if (error.message?.includes('Timeout')) {
            console.log('CAUSE: Possible event timeout within page.evaluate')
            console.log('HINT: One or more promises inside page.evaluate may have timed out')
          }
          
          // Check for object serialization error
          if (error.message?.includes('Object')) {
            console.log('CAUSE: Object serialization error')
            console.log('HINT: Ensure all returned values from page.evaluate are serializable')
          }
        }
        
        // Extract timeout information if present
        if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
          console.log('TYPE: Timeout Error')
          
          // Try to extract event name from enhanced error messages
          const eventMatch = error.message.match(/waiting for (?:event|SDK event)[:\s]+['"]?([^'"]+)['"]?/i)
          if (eventMatch) {
            console.log(`EVENT WAITING FOR: ${eventMatch[1]}`)
          }
          
          // Extract timeout duration if present
          const timeoutMatch = error.message.match(/\(timeout:\s*(\d+)ms\)/i)
          if (timeoutMatch) {
            console.log(`TIMEOUT DURATION: ${timeoutMatch[1]}ms`)
          }
          
          // Check for test vs promise timeout
          if (error.message?.includes('Test timeout of')) {
            console.log('TIMEOUT TYPE: Playwright test timeout')
          } else {
            console.log('TIMEOUT TYPE: Promise/Event timeout')
          }
        }
        
        if (error.stack) {
          console.log('\nStack trace:')
          // Show more lines for timeout errors to help debug
          const linesToShow = error.message?.includes('timeout') ? 10 : 5
          const stackLines = error.stack.split('\n').slice(0, linesToShow)
          stackLines.forEach(line => console.log(`  ${line}`))
          if (error.stack.split('\n').length > linesToShow) {
            console.log('  ... (truncated)')
          }
        }
      })
    }
    
    console.log('-'.repeat(80) + '\n')
  }
}

export default TestNameReporter