import { validateRequest } from './validateRequest'

describe('validateRequest', () => {
  const validKey = 'PSK_7TruNcSNTxp4zNrykMj4EPzF'
  const url = 'https://81f2-2-45-18-191.ngrok-free.app/'
  const rawBody =
    '{"call":{"call_id":"b5d63b2e-f75b-4dc8-b6d4-269b635f96c0","node_id":"fa3570ae-f8bd-42c2-83f4-9950d906c91b@us-west","segment_id":"b5d63b2e-f75b-4dc8-b6d4-269b635f96c0","call_state":"created","direction":"inbound","type":"phone","from":"+12135877632","to":"+12089806814","from_number":"+12135877632","to_number":"+12089806814","project_id":"4b7ae78a-d02e-4889-a63b-08b156d5916e","space_id":"62615f44-2a34-4235-b38b-76b5a1de6ef8"},"vars":{}}'
  const header = 'b18500437ebb010220ddd770cbe6fd531ea0ba0d'

  const invalidKey = 'PSK_foo'
  it('should return true if the signature matches', () => {
    const valid = validateRequest(validKey, header, url, rawBody)
    expect(valid).toBe(true)
  })

  it('should return false if the signature does not match', () => {
    const valid = validateRequest(invalidKey, header, url, rawBody)
    expect(valid).toBe(false)
  })

  it('should return false if the body is not correct', () => {
    const valid = validateRequest(validKey, header, url, '{"foo":"bar"}')
    expect(valid).toBe(false)
  })

  it('should return false if the url is not correct', () => {
    const valid = validateRequest(
      validKey,
      header,
      url + 'bar?q=hello',
      rawBody
    )
    expect(valid).toBe(false)
  })

  it('should return false if the header is not correct', () => {
    const valid = validateRequest(validKey, 'touched!', url, rawBody)
    expect(valid).toBe(false)
  })

  it('should throw an error if the rawBody is not a string', () => {
    expect(() => {
      // @ts-expect-error
      validateRequest(validKey, header, url, {})
    }).toThrow(TypeError)
  })

  describe('fallback to the compatibility-api check', () => {
    const defaultParams = {
      CallSid: 'CA1234567890ABCDE',
      Caller: '+14158675309',
      Digits: '1234',
      From: '+14158675309',
      To: '+18005551212',
    }
    const token = '12345'
    const defaultSignature = 'RSOYDt4T1cUTdK1PDd93/VVr8B8='
    const requestUrl = 'https://mycompany.com/myapp.php?foo=1&bar=2'

    it('should return true if the laml request is valid', () => {
      const valid = validateRequest(
        token,
        defaultSignature,
        requestUrl,
        JSON.stringify(defaultParams)
      )
      expect(valid).toBe(true)
    })

    it('should return false if the laml request is not valid', () => {
      const valid = validateRequest(
        token,
        'wrong_one!',
        requestUrl,
        JSON.stringify(defaultParams)
      )
      expect(valid).toBe(false)
    })
  })
})
