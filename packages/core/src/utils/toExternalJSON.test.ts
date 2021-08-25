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
})
