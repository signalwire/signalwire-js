import { logger } from '@signalwire/core'
import { createClient } from '@signalwire/realtime-api'

async function run() {
  const client = await createClient({
    project: process.env.PROJECT!,
    token: process.env.TOKEN!,
    contexts: ['default'],
    logLevel: 'trace',
  })

  await client.connect()
  const message = await client.message.sendSMS({
    context: 'default',
    body: 'can you hear me?????',
    to: '<FROM_NUMBER>',
    from: '<TO_NUMBER>',
    onMessageStateChange: (msgObj) => {
      logger.info('onMessageStateChange: ', msgObj.state)
    }
  })

  logger.info(`MESSAGE SENT >>>> message_id: ${message.id}, state: ${message.state}`)
}

run();