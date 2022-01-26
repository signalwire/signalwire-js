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

  describe('Environment variables', () => {
    const processEnv = process.env
    beforeEach(() => {
      jest.resetModules()
      process.env = { ...processEnv }
    })
    afterAll(() => {
      process.env = processEnv
    })

    it('should read from environment variables when the user doesnt provide token and/or project', () => {
      process.env.SW_PROJECT = 'env-project'
      process.env.SW_TOKEN = 'env-token'

      expect(getCredentials({})).toEqual({
        project: 'env-project',
        token: 'env-token',
      })
    })

    it('should give priority to user params over env variables', () => {
      process.env.SW_PROJECT = 'env-project'
      process.env.SW_TOKEN = 'env-token'

      expect(getCredentials({
        project: 'a-project',
        token: 'a-token'
      })).toEqual({
        project: 'a-project',
        token: 'a-token',
      })
    })
  })
})
