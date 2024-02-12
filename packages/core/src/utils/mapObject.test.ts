import { mapObject } from './mapObject'

describe('mapObject', () => {
  // simple type map to 'some.new.identifier'
  it('It should map some.old.id to some.new.id', () => {
    expect(mapObject('some.new.id', { type: 'some.old.id' })).toEqual({
      type: 'some.new.id',
    })
  })

  it('It should map some.old.id to some.new.id, not changing the payload', () => {
    expect(
      mapObject('some.new.id', {
        type: 'some.old.id',
        payload: {
          a: 1,
          b: '2',
          c: true,
          d: { x: {} },
        },
      })
    ).toEqual({
      type: 'some.new.id',
      payload: {
        a: 1,
        b: '2',
        c: true,
        d: { x: {} },
      },
    })
  })
  // dynamic type using payload data 'some.new.[value_from_this]'

  it('It should map some.old.id to some.new.created', () => {
    expect(
      mapObject('some.new.[state]', {
        type: 'some.old.id',
        payload: {
          state: 'created',
        },
      })
    ).toEqual({
      type: 'some.new.created',
      payload: {
        state: 'created',
      },
    })
  })

  // dynamic type using mapped payload data 'some.new.[value_from_this(created:started)]'

  it('It should map some.old.id to some.new.started', () => {
    expect(
      mapObject('some.new.[state(created:started)]', {
        type: 'some.old.id',
        payload: {
          state: 'created',
        },
      })
    ).toEqual({
      type: 'some.new.started',
      payload: {
        state: 'created',
      },
    })
  })

  // static type with payload mapping 'some.new.identifier{"old_path_a":"new_path_a","old_path_b":"new_path_c"}'
  // not working since we removed object_path
  it.skip('It should map some.old.id to some.new.id, changing the payload', () => {
    expect(
      mapObject(
        'some.new.id{"a":"a_number","b":"a_string","c":"a_boolean", "d.x": "a_object"}',
        {
          type: 'some.old.id',
          payload: {
            a: 1,
            b: '2',
            c: true,
            d: { x: {} },
          },
        }
      )
    ).toEqual({
      type: 'some.new.id',
      payload: {
        a_number: 1,
        a_string: '2',
        a_boolean: true,
        a_object: {},
        // This is a side effect we could improve later
        d: {},
      },
    })
  })

  // Everything `some.new.[value_from_this(started:created){"old_path_a":"new_path_a","old_path_b":"new_path_c"}]`
  // not working since we removed object_path
  it.skip('It should map some.old.id to some.new.id, changing the payload', () => {
    expect(
      mapObject(
        'some.new.[status(updated:mapped)]{"a":"a_number","b":"a_string","c":"a_boolean", "d.x": "a_object"}',
        {
          type: 'some.old.id',
          payload: {
            status: 'updated',
            a: 1,
            b: '2',
            c: true,
            d: { x: {} },
          },
        }
      )
    ).toEqual({
      type: 'some.new.mapped',
      payload: {
        status: 'updated',
        a_number: 1,
        a_string: '2',
        a_boolean: true,
        a_object: {},
        // This is a side effect we could improve later
        d: {},
      },
    })
  })
})

// Return Undefined
it('It should return undefined if the value not match', () => {
  expect(
    mapObject('some.new.[state(created:started)]', {
      type: 'some.old.id',
      payload: {
        state: 'stoped',
      },
    })
  ).toBeUndefined()
})

it('It should return undefined if property not found', () => {
  expect(
    mapObject('some.new.[status]', {
      type: 'some.old.id',
      payload: {
        state: 'stoped',
      },
    })
  ).toBeUndefined()
})
