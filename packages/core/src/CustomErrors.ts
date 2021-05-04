export class AuthError extends Error {
  name = 'AuthError'

  constructor(public code: number, public message: string) {
    super(message)
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}
