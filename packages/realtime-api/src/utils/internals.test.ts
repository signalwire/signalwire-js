import { config } from '../configure'
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

      expect(
        getCredentials({
          project: 'a-project',
          token: 'a-token',
        })
      ).toEqual({
        project: 'a-project',
        token: 'a-token',
      })
    })
  })

  describe('Global config', () => {
    const processEnv = process.env
    beforeEach(() => {
      jest.resetModules()
      process.env = { ...processEnv }
    })
    afterAll(() => {
      process.env = processEnv
    })

    it('should read options from global config (if available)', () => {
      config({
        project: 'global-project',
        token: 'global-token',
        cache: {},
      })

      expect(getCredentials({})).toEqual({
        project: 'global-project',
        token: 'global-token',
      })
    })

    it('should have last order of precedence when it comes to config values', () => {
      config({
        project: 'global-project',
        token: 'global-token',
        cache: {},
      })

      process.env.SW_PROJECT = 'env-project'
      process.env.SW_TOKEN = 'env-token'

      // process.env should have priority over the global
      // config
      expect(getCredentials({})).toEqual({
        project: 'env-project',
        token: 'env-token',
      })

      // Local config should have priority over both,
      // process.env and the global config
      expect(
        getCredentials({
          project: 'local-project',
          token: 'local-token',
        })
      ).toEqual({
        project: 'local-project',
        token: 'local-token',
      })

      // Local config for token not provided so process.env
      // should take priority over the global config for
      // that value
      expect(
        getCredentials({
          project: 'local-project',
        })
      ).toEqual({
        project: 'local-project',
        token: 'env-token',
      })

      // Neither local or process.env config was provided
      // for token so the global config will be used.
      process.env.SW_TOKEN = undefined
      expect(
        getCredentials({
          project: 'local-project',
        })
      ).toEqual({
        project: 'local-project',
        token: 'global-token',
      })

      process.env.SW_PROJECT = 'env-project'
      process.env.SW_TOKEN = 'env-token'
      expect(
        getCredentials({
          token: 'local-token',
        })
      ).toEqual({
        project: 'env-project',
        token: 'local-token',
      })

      process.env.SW_PROJECT = undefined
      expect(
        getCredentials({
          token: 'local-token',
        })
      ).toEqual({
        project: 'global-project',
        token: 'local-token',
      })
    })
  })
})
