import RestClientImpl from '@signalwire/compatibility-api'

describe('It generate LaML', () => {
  const FROM = '+11111111119'

  it('should generate LaML', () => {
    const response = new RestClientImpl.LaML.VoiceResponse()
    response.dial({ callerId: FROM }, '+11111111111')
    expect(response.toString()).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${FROM}">+11111111111</Dial></Response>`
    )
  })

  it('LaML to receive a fax', () => {
    const response = new RestClientImpl.LaML.FaxResponse()
    response.receive({ action: '/receive/fax' })
    expect(response.toString()).toEqual(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Receive action="/receive/fax"/></Response>'
    )
  })

  it('LaML to reject a fax', () => {
    const response = new RestClientImpl.LaML.FaxResponse()
    response.reject()
    expect(response.toString()).toEqual(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>'
    )
  })
})
