import { createRestClient } from './index'

describe('createRestClient', () => {
  it('should return an object with all the available methods', () => {
    const client = createRestClient({
      projectId: '<pid>',
      projectToken: '<pt>',
      spaceHost: 'space.host.io',
    })

    expect(client).toHaveProperty('createRoom')
    expect(client).toHaveProperty('deleteRoom')
    expect(client).toHaveProperty('getRoomById')
    expect(client).toHaveProperty('getRoomByName')
    expect(client).toHaveProperty('listAllRooms')
    expect(client).toHaveProperty('updateRoom')
    expect(client).toHaveProperty('createVRT')
  })

  it('should throw when required options are missing', () => {
    expect(() => createRestClient()).toThrow('Missing required options')
  })
})
