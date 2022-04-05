import { toSnakeCaseKeys } from './toSnakeCaseKeys'

describe.only('toSnakeCaseKeys', () => {
  it('should convert properties from camelCase to snake_case', () => {
    expect(
      toSnakeCaseKeys({
        someProperty: 'someValue',
        someOtherProperty: 'someOtherValue',
        nestedProperty: {
          nestedProperty1: 'nestedValue',
          nestedProperty2: 'nestedValue2',
          nestedProperty3: {
            nestedProperty4: 'nestedValue4',
            nestedProperty5: {
              nestedProperty6: 'nestedValue6',
              nestedProperty7: {
                nestedProperty8: 'nestedValue8',
              },
            },
          },
        },
        nestedPropertyWithLongName: 'nestedValueWithLongName',
      })
    ).toEqual({
      some_property: 'someValue',
      some_other_property: 'someOtherValue',
      nested_property: {
        nested_property1: 'nestedValue',
        nested_property2: 'nestedValue2',
        nested_property3: {
          nested_property4: 'nestedValue4',
          nested_property5: {
            nested_property6: 'nestedValue6',
            nested_property7: {
              nested_property8: 'nestedValue8',
            },
          },
        },
      },
      nested_property_with_long_name: 'nestedValueWithLongName',
    })
  })

  it('should allow passing a function for transforming values', () => {
    expect(
      toSnakeCaseKeys(
        {
          someProperty: 'someValue',
          someOtherProperty: 'someOtherValue',
          nestedProperty: {
            nestedProperty1: 'nestedValue',
            nestedProperty2: 'nestedValue2',
            nestedProperty3: {
              nestedProperty4: 'nestedValue4',
              nestedProperty5: {
                nestedProperty6: 'nestedValue6',
                nestedProperty7: {
                  nestedProperty8: 'nestedValue8',
                },
              },
            },
          },
        },
        (value: string) => value.toUpperCase()
      )
    ).toEqual({
      some_property: 'SOMEVALUE',
      some_other_property: 'SOMEOTHERVALUE',
      nested_property: {
        nested_property1: 'NESTEDVALUE',
        nested_property2: 'NESTEDVALUE2',
        nested_property3: {
          nested_property4: 'NESTEDVALUE4',
          nested_property5: {
            nested_property6: 'NESTEDVALUE6',
            nested_property7: {
              nested_property8: 'NESTEDVALUE8',
            },
          },
        },
      },
    })
  })
})
