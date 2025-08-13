#!/usr/bin/env node

/**
 * Test Runner for RTCPeer Integration Tests
 * 
 * This script manages the lifecycle of running integration tests:
 * 1. Starts the local TURN server
 * 2. Runs Playwright tests
 * 3. Generates comprehensive test reports
 * 4. Cleans up resources
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs').promises
const { SimpleTurnServer, waitForServer } = require('./test/turnServer')

class IntegrationTestRunner {
  constructor(options = {}) {
    this.options = {
      port: 3478,
      host: '127.0.0.1',
      timeout: 30000,
      generateReport: true,
      browsers: ['chromium', 'firefox', 'webkit'],
      ...options,
    }
    
    this.turnServer = null
    this.playwrightProcess = null
    this.results = {
      startTime: Date.now(),
      endTime: null,
      turnServerStarted: false,
      testsPassed: false,
      error: null,
      testResults: null,
    }
  }

  /**
   * Main entry point for running integration tests
   */
  async run() {
    console.log('🚀 Starting RTCPeer Integration Tests')
    console.log('=====================================')
    
    try {
      await this.startTurnServer()
      await this.runPlaywrightTests()
      await this.generateTestReport()
      
      this.results.testsPassed = true
      console.log('✅ All integration tests completed successfully!')
      
    } catch (error) {
      this.results.error = error
      console.error('❌ Integration tests failed:', error.message)
      process.exit(1)
      
    } finally {
      await this.cleanup()
      this.results.endTime = Date.now()
    }
  }

  /**
   * Start the local TURN server for testing
   */
  async startTurnServer() {
    console.log('🔄 Starting TURN server...')
    
    try {
      this.turnServer = new SimpleTurnServer({
        port: this.options.port,
        host: this.options.host,
      })
      
      await this.turnServer.start()
      
      // Wait for server to be fully ready
      const isReady = await waitForServer(
        this.options.host,
        this.options.port,
        this.options.timeout
      )
      
      if (!isReady) {
        throw new Error(`TURN server failed to start within ${this.options.timeout}ms`)
      }
      
      this.results.turnServerStarted = true
      console.log(`✅ TURN server started at ${this.options.host}:${this.options.port}`)
      
    } catch (error) {
      throw new Error(`Failed to start TURN server: ${error.message}`)
    }
  }

  /**
   * Run Playwright tests
   */
  async runPlaywrightTests() {
    console.log('🧪 Running Playwright integration tests...')
    
    return new Promise((resolve, reject) => {
      const playwrightArgs = [
        'npx',
        'playwright',
        'test',
        '--config=playwright.config.ts',
        '--reporter=json,line',
        `--output=test-results`,
      ]

      // Add browser-specific arguments if specified
      if (this.options.browsers && this.options.browsers.length > 0) {
        this.options.browsers.forEach(browser => {
          playwrightArgs.push(`--project=${browser}`)
        })
      }

      this.playwrightProcess = spawn('node', playwrightArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          TURN_SERVER_HOST: this.options.host,
          TURN_SERVER_PORT: this.options.port.toString(),
        },
      })

      let stdout = ''
      let stderr = ''

      this.playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        process.stdout.write(output)
      })

      this.playwrightProcess.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output
        process.stderr.write(output)
      })

      this.playwrightProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Playwright tests completed successfully')
          resolve({ stdout, stderr, code })
        } else {
          reject(new Error(`Playwright tests failed with exit code ${code}\\nstdout: ${stdout}\\nstderr: ${stderr}`))
        }
      })

      this.playwrightProcess.on('error', (error) => {
        reject(new Error(`Failed to start Playwright: ${error.message}`))
      })
    })
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    if (!this.options.generateReport) {
      return
    }

    console.log('📊 Generating test report...')

    try {
      const reportDir = path.join(process.cwd(), 'test-results')
      await fs.mkdir(reportDir, { recursive: true })

      // Try to read Playwright JSON report
      let playwrightResults = null
      try {
        const resultsPath = path.join(reportDir, 'test-results.json')
        const resultsContent = await fs.readFile(resultsPath, 'utf8')
        playwrightResults = JSON.parse(resultsContent)
      } catch (error) {
        console.warn('⚠️  Could not read Playwright results file:', error.message)
      }

      // Generate comprehensive report
      const report = {
        metadata: {
          testRunner: 'RTCPeer Integration Tests',
          timestamp: new Date().toISOString(),
          duration: this.results.endTime - this.results.startTime,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        turnServer: {
          started: this.results.turnServerStarted,
          config: this.turnServer ? this.turnServer.getConfig() : null,
          iceServers: this.turnServer ? this.turnServer.getIceServers() : null,
        },
        testExecution: {
          passed: this.results.testsPassed,
          error: this.results.error ? {
            message: this.results.error.message,
            stack: this.results.error.stack,
          } : null,
          browsers: this.options.browsers,
        },
        playwrightResults,
        environment: {
          ci: !!process.env.CI,
          headless: !process.env.PLAYWRIGHT_HEADED,
          workers: process.env.PLAYWRIGHT_WORKERS || 1,
        },
      }

      // Write detailed JSON report
      const reportPath = path.join(reportDir, 'integration-test-report.json')
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

      // Write human-readable summary
      const summaryPath = path.join(reportDir, 'integration-test-summary.md')
      const summary = this.generateMarkdownSummary(report)
      await fs.writeFile(summaryPath, summary)

      console.log(`✅ Test report generated at ${reportPath}`)
      console.log(`📋 Test summary available at ${summaryPath}`)

    } catch (error) {
      console.warn('⚠️  Failed to generate test report:', error.message)
    }
  }

  /**
   * Generate Markdown summary of test results
   */
  generateMarkdownSummary(report) {
    const { metadata, turnServer, testExecution, playwrightResults } = report
    
    let summary = `# RTCPeer Integration Test Report

## Test Execution Summary

- **Status**: ${testExecution.passed ? '✅ PASSED' : '❌ FAILED'}
- **Timestamp**: ${metadata.timestamp}
- **Duration**: ${Math.round(metadata.duration / 1000)}s
- **Browsers**: ${testExecution.browsers.join(', ')}
- **Node Version**: ${metadata.nodeVersion}
- **Platform**: ${metadata.platform} (${metadata.arch})

## TURN Server Configuration

- **Started**: ${turnServer.started ? '✅ Yes' : '❌ No'}
- **Host**: ${turnServer.config?.host || 'N/A'}
- **Port**: ${turnServer.config?.port || 'N/A'}
- **Realm**: ${turnServer.config?.realm || 'N/A'}

## ICE Servers

\`\`\`json
${JSON.stringify(turnServer.iceServers, null, 2)}
\`\`\`

`

    if (playwrightResults) {
      const stats = this.extractPlaywrightStats(playwrightResults)
      summary += `## Test Results

- **Total Tests**: ${stats.total}
- **Passed**: ${stats.passed}
- **Failed**: ${stats.failed}
- **Skipped**: ${stats.skipped}
- **Success Rate**: ${stats.successRate}%

### Test Breakdown by Browser

${stats.byBrowser.map(browser => 
  `- **${browser.name}**: ${browser.passed}/${browser.total} passed`
).join('\\n')}

`
    }

    if (testExecution.error) {
      summary += `## Error Details

\`\`\`
${testExecution.error.message}
\`\`\`

`
    }

    summary += `## Environment

- **CI**: ${report.environment.ci ? 'Yes' : 'No'}
- **Headless**: ${report.environment.headless ? 'Yes' : 'No'}
- **Workers**: ${report.environment.workers}

---

*Generated by RTCPeer Integration Test Runner*
`

    return summary
  }

  /**
   * Extract statistics from Playwright results
   */
  extractPlaywrightStats(results) {
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      successRate: 0,
      byBrowser: [],
    }

    if (results.suites) {
      // Process test suites
      const processSpec = (spec) => {
        if (spec.tests) {
          spec.tests.forEach(test => {
            test.results.forEach(result => {
              stats.total++
              switch (result.status) {
                case 'passed':
                  stats.passed++
                  break
                case 'failed':
                  stats.failed++
                  break
                case 'skipped':
                  stats.skipped++
                  break
              }
            })
          })
        }
        
        if (spec.suites) {
          spec.suites.forEach(processSpec)
        }
      }

      results.suites.forEach(processSpec)
      
      stats.successRate = stats.total > 0 
        ? Math.round((stats.passed / stats.total) * 100)
        : 0
    }

    return stats
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up resources...')

    try {
      // Stop TURN server
      if (this.turnServer) {
        await this.turnServer.stop()
        console.log('✅ TURN server stopped')
      }

      // Kill Playwright process if still running
      if (this.playwrightProcess && !this.playwrightProcess.killed) {
        this.playwrightProcess.kill('SIGTERM')
        console.log('✅ Playwright process terminated')
      }

    } catch (error) {
      console.warn('⚠️  Error during cleanup:', error.message)
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)
  const options = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        options.port = parseInt(args[++i])
        break
      case '--host':
        options.host = args[++i]
        break
      case '--timeout':
        options.timeout = parseInt(args[++i])
        break
      case '--no-report':
        options.generateReport = false
        break
      case '--browser':
        options.browsers = args[++i].split(',')
        break
      case '--help':
        console.log(`
RTCPeer Integration Test Runner

Usage: node run-integration-tests.js [options]

Options:
  --port <port>       TURN server port (default: 3478)
  --host <host>       TURN server host (default: 127.0.0.1)  
  --timeout <ms>      Server startup timeout (default: 30000)
  --no-report         Skip generating test report
  --browser <list>    Comma-separated list of browsers (default: chromium,firefox,webkit)
  --help              Show this help message

Examples:
  node run-integration-tests.js
  node run-integration-tests.js --browser chromium --port 3479
  node run-integration-tests.js --no-report --timeout 60000
`)
        process.exit(0)
        break
    }
  }

  const runner = new IntegrationTestRunner(options)
  await runner.run()
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...')
  process.exit(130)
})

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...')
  process.exit(143)
})

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { IntegrationTestRunner }