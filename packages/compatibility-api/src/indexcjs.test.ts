const twilio = require('twilio')
const { RestClient } = require('@signalwire/compatibility-api')

describe('It generate LaML', () => {
  const FROM = '+11111111119'

  it('should generate LaML', () => {
    const response = new RestClient.LaML.VoiceResponse()
    response.dial({ callerId: FROM }, '+11111111111')
    expect(response.toString()).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${FROM}">+11111111111</Dial></Response>`
    )
  })

  it('LaML to receive a fax', () => {
    const response = new RestClient.LaML.FaxResponse()
    response.receive({ action: '/receive/fax' })
    expect(response.toString()).toEqual(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Receive action="/receive/fax"/></Response>'
    )
  })

  it('LaML to reject a fax', () => {
    const response = new RestClient.LaML.FaxResponse()
    response.reject()
    expect(response.toString()).toEqual(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>'
    )
  })
})

describe('It is constructable', () => {
  const client = twilio('AC', 'token', {})
  const twilioProperties = Object.getOwnPropertyDescriptors(
    Object.getPrototypeOf(client)
  )

  it('should expose all the properties', () => {
    const client = RestClient('a', 'b', {
      signalwireSpaceUrl: 'example.domain.com',
    })
    Object.keys(twilioProperties).forEach((prop) => {
      expect(client[prop]).toBeDefined()
    })
  })

  it('should read the spaceUrl from SIGNALWIRE_SPACE_URL variable', () => {
    process.env.SIGNALWIRE_SPACE_URL = 'example.domain.com'

    const client = RestClient('a', 'b')
    Object.keys(twilioProperties).forEach((prop) => {
      expect(client[prop]).toBeDefined()
    })

    delete process.env.SIGNALWIRE_SPACE_URL
  })

  it('should read the spaceUrl from SIGNALWIRE_API_HOSTNAME variable', () => {
    process.env.SIGNALWIRE_API_HOSTNAME = 'example.domain.com'

    const client = RestClient('a', 'b')
    Object.keys(twilioProperties).forEach((prop) => {
      expect(client[prop]).toBeDefined()
    })

    delete process.env.SIGNALWIRE_API_HOSTNAME
  })
})
