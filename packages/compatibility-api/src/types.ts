import type { Twilio } from 'twilio'
export interface CompatibilityAPIRestClientOptions
  extends Twilio.TwilioClientOptions {
  signalwireSpaceUrl?: string
}
