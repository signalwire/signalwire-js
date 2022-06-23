import twilio, { Twilio } from 'twilio'
import { RestClient } from '@signalwire/compatibility-api'
import tap from 'tap'

async function run() {
  try {
    tap.ok(RestClient.jwt.AccessToken, 'RestClient.jwt.AccessToken is defined')
    tap.ok(
      RestClient.jwt.ClientCapability,
      'RestClient.jwt.ClientCapability is defined'
    )
    tap.ok(RestClient.jwt.taskrouter, 'RestClient.jwt.taskrouter is defined')
    tap.ok(
      RestClient.LaML.VoiceResponse,
      'RestClient.LaML.VoiceResponse is defined'
    )
    tap.ok(
      RestClient.LaML.FaxResponse,
      'RestClient.LaML.FaxResponse is defined'
    )
    tap.ok(
      RestClient.LaML.MessagingResponse,
      'RestClient.LaML.MessagingResponse is defined'
    )
    tap.ok(RestClient.RequestClient, 'RestClient.RequestClient is defined')
    tap.ok(RestClient.Twilio, 'RestClient.Twilio is defined')
    tap.ok(
      RestClient.validateExpressRequest,
      'RestClient.validateExpressRequest is defined'
    )
    tap.ok(RestClient.validateRequest, 'RestClient.validateRequest is defined')
    tap.ok(
      RestClient.validateRequestWithBody,
      'RestClient.validateRequestWithBody is defined'
    )
    tap.ok(RestClient.webhook, 'RestClient.webhook is defined')
    const twilioProperties = Object.getOwnPropertyDescriptors(
      Object.getPrototypeOf(twilio('AC', 'token', {}))
    )
    const client = RestClient('a', 'b', {
      signalwireSpaceUrl: 'example.domain.com',
    })
    Object.keys(twilioProperties).forEach((prop) => {
      tap.ok(client[prop as keyof Twilio], `${prop} is defined`)
    })
    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
