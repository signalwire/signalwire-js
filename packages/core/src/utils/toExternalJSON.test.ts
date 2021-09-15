import { toExternalJSON } from './toExternalJSON'

describe('toExternalJSON', () => {
  it('converts all the keys from snake_case to camelCase', async () => {
    const input = {
      snake_case: 'test',
      another_prop: null,
      some_other_property: {
        nested_property: {
          nested_prop_2: 'nested prop value',
        },
        prop_2: 'test',
      },
    }

    const output = {
      snakeCase: 'test',
      anotherProp: null,
      someOtherProperty: {
        nestedProperty: {
          nestedProp2: 'nested prop value',
        },
        prop2: 'test',
      },
    }

    expect(toExternalJSON(input)).toStrictEqual(output)
  })

  it('converts the values from `updated` keys to be camelCase', () => {
    const input = {
      updated: ['camel_case_prop_1', 'camel_case_prop_2', 'camel_case_prop_3'],
    }

    const output = {
      updated: ['camelCaseProp1', 'camelCaseProp2', 'camelCaseProp3'],
    }

    expect(toExternalJSON(input)).toStrictEqual(output)
  })

  it('converts values for any specified property in `options.propsToUpdateValue`', () => {
    const input = {
      updated_two: [
        'camel_case_prop_1',
        'camel_case_prop_2',
        'camel_case_prop_3',
      ],
    }

    const output = {
      updatedTwo: ['camelCaseProp1', 'camelCaseProp2', 'camelCaseProp3'],
    }

    expect(
      toExternalJSON(input, {
        propsToUpdateValue: ['updated_two'],
      })
    ).toStrictEqual(output)
  })

  it('converts the layout `layers` key to be camelCase', () => {
    const input = {
      layers: [
        {
          y: 25,
          x: 0,
          layer_index: 0,
          height: 50,
          z_index: 0,
          reservation: 'focus-1',
          width: 50,
        },
        {
          y: 25,
          x: 50,
          layer_index: 1,
          height: 50,
          z_index: 1,
          reservation: 'focus-2',
          width: 50,
        },
      ],
      room_session_id: '688d9de2-09ac-4dd9-89c6-59e44fa9cd44',
      room_id: '24c86438-8cd7-4315-9cf4-e3ac0b8cb588',
      name: '2x1',
    }

    const output = {
      layers: [
        {
          y: 25,
          x: 0,
          layerIndex: 0,
          height: 50,
          zIndex: 0,
          reservation: 'focus-1',
          width: 50,
        },
        {
          y: 25,
          x: 50,
          layerIndex: 1,
          height: 50,
          zIndex: 1,
          reservation: 'focus-2',
          width: 50,
        },
      ],
      roomSessionId: '688d9de2-09ac-4dd9-89c6-59e44fa9cd44',
      roomId: '24c86438-8cd7-4315-9cf4-e3ac0b8cb588',
      name: '2x1',
    }

    expect(toExternalJSON(input)).toStrictEqual(output)
  })
})
