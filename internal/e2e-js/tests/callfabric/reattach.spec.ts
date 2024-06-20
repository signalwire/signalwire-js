import { test, expect } from '../../fixtures'
import {
  CF_REFERENCE_CLIENT_URL,
  CF_E2E_TEST_ROOM_ADDRESS,
  CF_E2E_SWML_ADDRESS,
  CF_E2E_LONG_RUNNING_SWML_ADDRESS,
  CF_E2E_CALLER_EMAIL,
  CF_E2E_CALLER_PASSWORD,
  CF_E2E_CALLEE_EMAIL,
  CF_E2E_CALLEE_PASSWORD,
  CF_E2E_CALLEE_ADDRESS
} from '../../utils'

test.describe('Reattach Tests', () => {
  test('WebRTC to Room', async ({
    createCustomVanillaPage,
  }) => {

    const page = await createCustomVanillaPage({ name: '[page]' })

    await page.goto(CF_REFERENCE_CLIENT_URL)

    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Subscriber OAuth'}).click()

    await page.waitForLoadState('domcontentloaded')
    // @ts-ignore
    await page.getByLabel('Email').fill(CF_E2E_CALLER_EMAIL)
    await page.getByText('Continue').click()

    await page.locator('button[type="submit"]').last().click()

    await page.waitForLoadState('domcontentloaded')
    await page.getByLabel('Password').fill(CF_E2E_CALLER_PASSWORD)
    await page.getByText('Log In').click()

    await page.waitForLoadState('domcontentloaded')

    await page.waitForSelector('text="User Info"', { timeout: 10000 })

    await page.getByLabel('Address').fill(CF_E2E_TEST_ROOM_ADDRESS)
    await page.getByText('Dial').click()

    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })

    await page.reload({ waitUntil: 'domcontentloaded'})
    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })
  })

  test('WebRTC -> SWML -> Room', async ({
    createCustomVanillaPage,
  }) => {

    const page = await createCustomVanillaPage({ name: '[page]' })

    await page.goto(CF_REFERENCE_CLIENT_URL)

    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Subscriber OAuth'}).click()

    await page.waitForLoadState('domcontentloaded')
    // @ts-ignore
    await page.getByLabel('Email').fill(CF_E2E_CALLER_EMAIL)
    await page.getByText('Continue').click()

    await page.locator('button[type="submit"]').last().click()

    await page.waitForLoadState('domcontentloaded')
    await page.getByLabel('Password').fill(CF_E2E_CALLER_PASSWORD)
    await page.getByText('Log In').click()

    await page.waitForLoadState('domcontentloaded')

    await page.waitForSelector('text="User Info"', { timeout: 10000 })

    await page.getByLabel('Address').fill(CF_E2E_SWML_ADDRESS)
    await page.getByText('Dial').click()

    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })

    await page.reload({ waitUntil: 'domcontentloaded'})
    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })
  })

  test('WebRTC -> Subscriber', async ({
    createCustomVanillaPage,
    browser
  }) => {

    const page = await createCustomVanillaPage({ name: '[page]' })
    await page.goto(CF_REFERENCE_CLIENT_URL)

    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Subscriber OAuth'}).click()

    await page.waitForLoadState('domcontentloaded')
    // @ts-ignore
    await page.getByLabel('Email').fill(CF_E2E_CALLER_EMAIL)
    await page.getByText('Continue').click()

    await page.locator('button[type="submit"]').last().click()

    await page.waitForLoadState('domcontentloaded')
    await page.getByLabel('Password').fill(CF_E2E_CALLER_PASSWORD)
    await page.getByText('Log In').click()

    await page.waitForLoadState('domcontentloaded')

    await page.waitForSelector('text="User Info"', { timeout: 10000 })

    const newContext = await browser.newContext()
    const page2 = await createCustomVanillaPage({ name: '[page2]', context: newContext })
    await page2.goto(CF_REFERENCE_CLIENT_URL)

    await page2.waitForLoadState('domcontentloaded')
    await page2.getByRole('link', { name: 'Subscriber OAuth'}).click()

    await page2.waitForLoadState('domcontentloaded')
    // @ts-ignore
    await page2.getByLabel('Email').fill(CF_E2E_CALLEE_EMAIL)
    await page2.getByText('Continue').click()

    await page2.locator('button[type="submit"]').last().click()

    await page2.waitForLoadState('domcontentloaded')
    await page2.getByLabel('Password').fill(CF_E2E_CALLEE_PASSWORD)
    await page2.getByText('Log In').click()

    await page2.waitForLoadState('domcontentloaded')

    await page2.waitForSelector('text="User Info"', { timeout: 10000 })

    await page2.locator('text="Avaliable"').click()

    await page.getByLabel('Address').fill(CF_E2E_CALLEE_ADDRESS)
    await page.getByText('Dial').click()

    await expect.poll(async () => {
      const status = await page2.locator('#connectStatus').textContent()
      return status == 'Ringing'
    }, { timeout: 50000 }).toBe(true)

    // NOTE: need to click answer with evaluate
    // page2.locator('#btnAnswer').click() doesn't work 
    // due to ringing animation on ref client
    await page2.evaluate(async () => {
      const answerBtn = document.getElementById('btnAnswer')
      // @ts-ignore
      answerBtn.click()
    })

    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })

    await page.reload({ waitUntil: 'domcontentloaded'})
    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })
  })

  test('WebRTC -> Long running SWML', async ({
    createCustomVanillaPage,
  }) => {

    const page = await createCustomVanillaPage({ name: '[page]' })

    await page.goto(CF_REFERENCE_CLIENT_URL)

    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Subscriber OAuth'}).click()

    await page.waitForLoadState('domcontentloaded')
    // @ts-ignore
    await page.getByLabel('Email').fill(CF_E2E_CALLER_EMAIL)
    await page.getByText('Continue').click()

    await page.locator('button[type="submit"]').last().click()

    await page.waitForLoadState('domcontentloaded')
    await page.getByLabel('Password').fill(CF_E2E_CALLER_PASSWORD)
    await page.getByText('Log In').click()

    await page.waitForLoadState('domcontentloaded')

    await page.waitForSelector('text="User Info"', { timeout: 10000 })

    await page.getByLabel('Address').fill(CF_E2E_LONG_RUNNING_SWML_ADDRESS)
    await page.getByText('Dial').click()

    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })

    await page.reload({ waitUntil: 'domcontentloaded'})
    await expect(page.locator('span#connectStatus', { hasText: /^Connected$/ })).toBeVisible({ timeout: 30000 })
  })
})