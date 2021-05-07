import { getConfig } from './getConfig'

describe('getConfig', () => {
  it('should throw is required options are not defined', () => {
    expect(() => getConfig()).toThrow('Missing required options')
    expect(() => getConfig({ projectId: '<pid>' })).toThrow(
      'Missing required options'
    )
    expect(() => getConfig({ projectToken: '<pt>' })).toThrow(
      'Missing required options'
    )
    expect(() => getConfig({ spaceHost: 'space.host.io' })).toThrow(
      'Missing required options'
    )
    expect(() =>
      getConfig({ projectId: '<pid>', projectToken: '<pt>' })
    ).toThrow('Missing required options')
    expect(() =>
      getConfig({ spaceHost: 'space.host.io', projectToken: '<pt>' })
    ).toThrow('Missing required options')
    expect(() =>
      getConfig({ projectId: '<pid>', spaceHost: 'space.host.io' })
    ).toThrow('Missing required options')
  })

  it('should return baseUrl property if one is not defined', () => {
    expect(
      getConfig({
        projectId: '<pid>',
        projectToken: '<pt>',
        spaceHost: 'space.host.io',
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
