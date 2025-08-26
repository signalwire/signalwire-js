import { expectPageEvalToPass, expectToPass, SERVER_URL } from '../../utils'
import { test, expect } from '../../fixtures'

test.describe('utils', () => {
  test.describe('expectToPass', () => {
    test('expectToPass: should resolve when the function passes', async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      await expectToPass(
        async () => {
          const result = await page.waitForFunction(() => true)
          expect(await result.jsonValue()).toBe(true)
        },
        { message: 'should resolve when the function passes' }
      )
    })

    test('should fail with a custom message and stack trace', async ({
      createCustomPage,
    }) => {
      let expectedError: Error | undefined = undefined
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      try {
        await expectToPass(
          async () => {
            await page.waitForFunction(() => {
              throw new Error('test error')
            })
          },
          { message: 'custom message' }
        )
      } catch (error) {
        expectedError = error
      }
      expect(expectedError).toBeDefined()
      expect(expectedError).toBeInstanceOf(Error)
      expect(expectedError).toMatchObject({
        message: expect.stringContaining('custom message'),
        stack: expect.stringContaining('utils.spec.ts'),
      })
    })

    test('should timeout when waiting for a promise to resolve', async () => {
      expect(
        expectToPass(
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          },
          { message: 'expect timeout' },
          { timeout: 100 }
        )
      ).rejects.toThrow('Timeout 100ms exceeded while waiting on the predicate')
    })

    test('should respect custom timeout option', async ({
      createCustomPage,
    }) => {
      const page = await createCustomPage({ name: '[page]' })

      const startTime = Date.now()
      let expectedError: Error | undefined = undefined

      try {
        await expectToPass(
          async () => {
            await page.waitForTimeout(3000) // Delay longer than timeout
            expect(false).toBe(true) // Will never pass
          },
          { message: 'should timeout in 1 second' },
          { timeout: 1000 } // Short timeout
        )
      } catch (error) {
        expectedError = error
      }

      const elapsedTime = Date.now() - startTime
      expect(expectedError).toBeDefined()
      expect(elapsedTime).toBeLessThan(2000) // Should timeout quickly
    })

    test('should use custom interval array', async ({ createCustomPage }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      let attemptCount = 0
      const attempts: number[] = []

      await expectToPass(
        async () => {
          attempts.push(Date.now())
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Not ready yet')
          }
          // Pass on 3rd attempt
        },
        { message: 'should use custom intervals' },
        { interval: [100, 200, 300], timeout: 10000 }
      )

      expect(attemptCount).toBe(3)
      expect(attempts.length).toBe(3)
    })

    test('should use default options when none provided', async () => {
      let attemptCount = 0

      await expectToPass(
        async () => {
          attemptCount++
          if (attemptCount < 2) {
            throw new Error('Not ready yet')
          }
          // Pass on 2nd attempt
        },
        { message: 'should use defaults' }
        // No options parameter
      )

      expect(attemptCount).toBe(2)
    })

    test('should handle immediate success without retries', async () => {
      let attemptCount = 0

      await expectToPass(
        async () => {
          attemptCount++
          // Succeeds immediately
          expect(true).toBe(true)
        },
        { message: 'should succeed immediately' }
      )

      expect(attemptCount).toBe(1) // Should only run once
    })

    test('should handle promise rejection properly', async () => {
      let expectedError: Error | undefined = undefined

      try {
        await expectToPass(
          async () => {
            return Promise.reject(new Error('Async rejection'))
          },
          { message: 'should handle rejection' },
          { timeout: 1000 }
        )
      } catch (error) {
        expectedError = error
      }

      expect(expectedError).toBeDefined()
      expect(expectedError?.message).toMatch(/should handle rejection/)
    })

    test('should handle longer polling scenarios', async () => {
      let attemptCount = 0
      const startTime = Date.now()

      await expectToPass(
        async () => {
          attemptCount++
          // Simulate waiting for a condition that takes time
          if (Date.now() - startTime < 2000) {
            throw new Error('Still waiting...')
          }
          expect(attemptCount).toBeGreaterThan(1)
        },
        { message: 'should handle longer polling' },
        { timeout: 5000 }
      )

      expect(attemptCount).toBeGreaterThan(1)
    })
  })
})

test.describe('waitForFunction', () => {
  test('TODO: should resolve when the function returns a truthy value', async () => {
    test.skip(
      true,
      'TODO: Implement test for waitForFunction resolving on truthy value'
    )
  })

  test('TODO: should timeout if the function never returns truthy', async () => {
    test.skip(true, 'TODO: Implement test for waitForFunction timeout behavior')
  })

  test('TODO: should pass arguments to the page function', async () => {
    test.skip(true, 'TODO: Implement test for waitForFunction argument passing')
  })
})

test.describe('expectPageEvalToPass', () => {
  test('should resolve when the page evaluation passes', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    const result = await expectPageEvalToPass(page, {
      assertionFn: (result) => {
        expect(result).toBe(true)
      },
      evaluateFn: () => true,
      message: 'pass - resolve when the function returns a truthy value',
    })

    expect(result).toBe(true)

    // with promise
    const result2 = await expectPageEvalToPass(page, {
      assertionFn: (result) => {
        expect(result).toBe(true)
      },
      evaluateFn: () => Promise.resolve(true),
      message: 'pass - resolve when the function returns a truthy value',
    })
    expect(result2).toBe(true)
  })

  test.only('should throw when the evaluateFn throws an error', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    expect(
      expectPageEvalToPass(page, {
        assertionFn: (result: unknown) => {
          // should not be called because the evaluateFn throws an error
          expect(result).not.toBeInstanceOf(Error)
          expect(result).not.toMatchObject({
            message: 'test error',
          })
          // should never pass to ensure expect().toPass() does not resolve
          expect(false).toBe(true)
        },
        evaluateFn: () => {
          throw new Error('test error')
        },
        message: 'expect error',
      })
    ).rejects.toThrow('expect error')
  })

  test('should pass evaluateArgs to the evaluateFn and return the serializable object', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    const result = await expectPageEvalToPass(page, {
      assertionFn: (result) => {
        expect(result).toMatchObject({
          param: 'test',
          param2: false,
          param3: 123,
          param4: {},
        })
      },
      evaluateArgs: {
        param: 'test',
        param2: false,
        param3: 123,
        param4: {},
      },
      evaluateFn: (params) => {
        return params
      },
      message: 'pass - resolve when the function returns a truthy value',
    })

    expect(result).toMatchObject({
      param: 'test',
      param2: false,
      param3: 123,
      param4: {},
    })
  })

  test('should timeout when page evaluation takes too long', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    await expect(
      expectPageEvalToPass(page, {
        assertionFn: (result) => {
          // should never be called
          expect(result).not.toMatch('should not resolve')
        },
        evaluateFn: () => {
          return new Promise((resolve) =>
            setTimeout(() => resolve('should not resolve'), 5000)
          )
        },
        message: 'timeout - should timeout when page evaluation takes too long',
        timeoutMs: 100,
      })
    ).rejects.toThrow(
      'timeout - should timeout when page evaluation takes too long'
    )
  })
})
