import { JWTSession } from './JWTSession'

describe('JWTSession', () => {
  it('should give priority to the host coming from the JWT (if present)', () => {
    const tokenWithCH =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImNoIjoiZXhhbXBsZS5ob3N0LmRvbWFpbi5jb20ifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.G7CvxKKQV44kk3wdiKaq2VYOb2UayJBpKKPXn_84j9E'
    const session = new JWTSession({
      token: tokenWithCH,
    })

    expect(session.host).toBe('wss://example.host.domain.com')

    const tokenWithoutCH =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const sessionTwo = new JWTSession({
      token: tokenWithoutCH,
    })

    expect(sessionTwo.host).toBe('wss://relay.signalwire.com')
  })

  it('should give priority to the host coming from the userParams (if present)', () => {
    const session = new JWTSession({
      host: 'ws://localhost:8080',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImNoIjoiZXhhbXBsZS5ob3N0LmRvbWFpbi5jb20ifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.G7CvxKKQV44kk3wdiKaq2VYOb2UayJBpKKPXn_84j9E',
    })

    expect(session.host).toBe('ws://localhost:8080')
  })

  it('should fallback to `host` if the `cf` header coming on the JWT is not there or invalid', () => {
    const sessionOne = new JWTSession({
      host: 'ws://localhost:8080',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    })

    const sessionTwo = new JWTSession({
      host: 'ws://localhost:8080',
      token: '<invalid-jwt>',
    })

    expect(sessionOne.host).toBe('ws://localhost:8080')
    expect(sessionTwo.host).toBe('ws://localhost:8080')
  })

  it('should fallback to the default host if either `host` or `jwt.header.cf` are not defined', () => {
    const session = new JWTSession({
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    })

    expect(session.host).toBe('wss://relay.signalwire.com')
  })
})
