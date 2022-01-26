import { getCredentials } from './internals'

describe('getCredentials', () => {
  it('should throw if either project and/or token are missing', () => {
    expect(() =>
      getCredentials({
        token: 'some-token',
      })
    ).toThrow('Missing `project`')
    expect(() =>
      getCredentials({
        project: 'some-project',
      })
    ).toThrow('Missing `token`')
    expect(() => getCredentials({})).toThrow()
  })
})
