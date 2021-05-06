import { getConfig } from './getConfig'

describe('getConfig', () => {
  it('should throw is required options are not defined', () => {
    expect(() => getConfig()).toThrow('Missing required options')
  })

  it('should return baseUrl property if one is not defined', () => {
    expect(
      getConfig({
        projectId: '<pid>',
        projectToken: '<pt>',
      })
    ).toHaveProperty('baseUrl')
  })

  it('should allow to overwrite the spaceHost', () => {
    expect(
      getConfig({
        projectId: '<pid>',
        projectToken: '<pt>',
        spaceHost: 'sg.test.io',
      }).baseUrl
    ).toBe('https://sg.test.io/api/')
  })
})
