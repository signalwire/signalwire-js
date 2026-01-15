#!/usr/bin/env node

import 'dotenv/config'

const API_HOST = process.env.API_HOST
const PROJECT_ID = process.env.PROJECT_ID
const API_TOKEN = process.env.API_TOKEN
const DEFAULT_REFERENCE = process.env.SAT_REFERENCE

function printUsage() {
  console.log(`
Usage: sw-sat --reference <subscriber_reference>

Options:
  --reference, -r   The subscriber reference (e.g., email@server.com)
  --ttl, -t         Token time-to-live in seconds (optional)
  --help, -h        Show this help message

Environment variables (via .env file):
  API_HOST          SignalWire space hostname (e.g., your-space.signalwire.com)
  PROJECT_ID        SignalWire Project ID
  API_TOKEN         SignalWire API Token
  SAT_REFERENCE     Default subscriber reference (used if --reference not provided)
Example:
  sw-sat --reference user@example.com
  sw-sat -r user@example.com --ttl 3600
`)
}

function parseArgs(args) {
  const result = { reference: null, ttl: null }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--reference' || arg === '-r') {
      result.reference = args[++i]
    }

    if (arg === '--ttl' || arg === '-t') {
      const ttlSeconds = parseInt(args[++i], 10)
      result.ttl = Math.floor(Date.now() / 1000) + ttlSeconds
    }
  }

  return result
}

async function createSATToken(reference, ttl) {
  const basicToken = Buffer.from(`${PROJECT_ID}:${API_TOKEN}`).toString('base64')

  const body = { reference }
  if (ttl) {
    body.expire_at = ttl
  }

  const response = await fetch(
    `https://${API_HOST}/api/fabric/subscribers/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicToken}`,
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`
    )
  }

  const data = await response.json()
  return data.token
}

async function main() {
  // Check for help flag first (before env validation)
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  // Parse command line arguments
  const args = parseArgs(process.argv.slice(2))

  // Validate environment variables
  const missingVars = []
  if (!API_HOST) missingVars.push('API_HOST')
  if (!PROJECT_ID) missingVars.push('PROJECT_ID')
  if (!API_TOKEN) missingVars.push('API_TOKEN')

  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`)
    console.error('Please create a .env file with the required configuration.')
    process.exit(1)
  }

  const reference = args.reference || DEFAULT_REFERENCE
  if (!reference) {
    console.error('Error: --reference is required (or set SAT_REFERENCE in .env)')
    printUsage()
    process.exit(1)
  }

  try {
    const token = await createSATToken(reference, args.ttl)
    console.log(token)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

main()
