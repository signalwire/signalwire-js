import { sessionStorageManager } from './storage'

// Mock window for Node.js environment
Object.defineProperty(global, 'window', {
  value: {
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    },
  },
  writable: true,
})

describe('sessionStorageManager', () => {
  it('should return expected keys', () => {
    const token =
      'eyJ0eXBiOiJWUlQiLCJjaCI6InJlbGF5LnNpZ25hbHdpcmUuY29tIiwiYWxnIjoiPOE1MTIifQ.eyJpYXQiOjE2ODg0NjE3MDMsImp0aSI6IjA1YWZkODczLTI4MGUtNDYzNC1iNmQzLWMwMzk4YzE2NGVlMSIsInN1YiI6IjRiN2FlNzhhLWQwMmUtNDg4OS1hNjNiLTA4YjE1NmQ1OTE2ZSIsInUiOiJqZXN0IiwiamEiOiJtZW1iZXIiLCJyIjoidGVhbS10ZXN0IiwicyI6W10sImFjciI6dHJ1ZSwibWEiOiJhbGwiLCJtdGEiOnt9LCJybXRhIjp7fX0.r1JWiEckaids8mm9ESUraCuXWc6Ysa6qMMmuNzRiOf94PO8VwoL_gIr1LDopDtffk-EFUUB4ZsOl8gK-u-qU7A'
    const manager = sessionStorageManager(token)
    expect(manager).toStrictEqual({
      authStateKey: 'as-team-test',
      protocolKey: 'pt-team-test',
      callIdKey: 'ci-team-test',
    })
  })

  it('should return falsy values', () => {
    const token = 'foo'
    const manager = sessionStorageManager(token)
    expect(manager).toStrictEqual({
      authStateKey: false,
      protocolKey: false,
      callIdKey: false,
    })
  })
})
