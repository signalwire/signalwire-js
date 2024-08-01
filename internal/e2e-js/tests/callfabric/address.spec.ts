import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

test.describe('Addresses', () => {
  test('query multiple addresses and single address', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const { addressById, addressByName, addressToCompare } =
      await page.evaluate(async () => {
        // @ts-expect-error
        const client = window._client

        const response = await client.address.getAddresses()
        const addressToCompare = response.data[0]

        const addressById = await client.address.getAddress({
          id: addressToCompare.id,
        })

        const addressByName = await client.address.getAddress({
          name: addressToCompare.name,
        })
        return { addressById, addressByName, addressToCompare }
      })

    expect(addressById.id).toEqual(addressToCompare.id)
    expect(addressByName.id).toEqual(addressToCompare.id)
  })
})
