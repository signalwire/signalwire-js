import {
  expectPageEvalToPass,
  expectToPass,
  SERVER_URL,
  waitForFunction,
} from '../../utils'
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
        { intervals: [100, 200, 300], timeout: 10000 }
      )

      expect(attemptCount).toBe(3)
      expect(attempts.length).toBe(3)
    })

    test('default behavior is not to poll/retry if timeout and intervals are same', async () => {
      let attemptCount = 0
      await expect(
        expectToPass(
          async () => {
            attemptCount++
            if (attemptCount < 2) {
              // expected exception which will not trigger polling as timeout and intervals are the same
              throw new Error('Test error')
            }
          },
          {
            message:
              'Test error - should not retry (poll) if timeout and intervals are same',
          }
        )
      ).rejects.toThrow(
        'Test error - should not retry (poll) if timeout and intervals are same'
      )

      expect(attemptCount).toBe(1)
    })

    test('should retry until the predicate passes if intervals are provided', async () => {
      let attemptCount = 0

      await expectToPass(
        async () => {
          attemptCount++
          if (attemptCount < 10) {
            throw new Error('Test error - should retry if polling is enabled')
          }
        },
        {
          message:
            'should retry until the predicate passes if intervals are provided',
        },
        { intervals: [10] }
      )

      expect(attemptCount).toBe(10)
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
        { timeout: 5000, intervals: [1000] }
      )

      expect(attemptCount).toBeGreaterThan(1)
    })

    test('should only poll once if the intervals and timeout are the same', async () => {
      let attemptCount = 0
      try {
        await expectToPass(
          async () => {
            attemptCount++
            if (attemptCount < 2) {
              // when rejected, expectToPass will poll again
              return Promise.reject(new Error('Not ready yet'))
            }
          },
          {
            message:
              'should only poll once if the intervals and timeout are the same',
          },
          { timeout: 1000, intervals: [1000] }
        )
      } catch (error) {}

      expect(attemptCount).toBe(1)
    })

    test('it should poll at least twice if the intervals are different from the timeout', async () => {
      let attemptCount = 0
      await expectToPass(
        async () => {
          attemptCount++
          if (attemptCount < 3) {
            // when rejected, expectToPass will poll again
            return Promise.reject(new Error('Not ready yet'))
          }
          return
        },
        {
          message:
            'should poll at least twice if the intervals are different from the timeout',
        },
        { timeout: 1000, intervals: [10, 10, 20] }
      )

      expect(attemptCount).toBeGreaterThan(1)
      expect(attemptCount).toBe(3)
    })
  })
})

test.describe('waitForFunction', () => {
  test.setTimeout(5000)
  test('should resolve when the function returns a truthy value', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    const resultJSHandle = await waitForFunction(page, {
      evaluateFn: async () => {
        return await new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 1000)
        })
      },
      message: 'should resolve when the function returns a truthy value',
    })
    expect(await resultJSHandle.jsonValue()).toBe(true)
  })

  test('should timeout if the function never returns truthy', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    expect(
      waitForFunction(page, {
        evaluateFn: async () => {
          return await new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(false)
            }, 1000)
          })
        },
      })
    ).rejects.toThrow(
      'waitForFunction: Error: page.waitForFunction: Test ended.'
    )
  })

  test('should pass arguments to the page function', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    const resultJSHandle = await waitForFunction(page, {
      evaluateArgs: { param: 'test' },
      evaluateFn: (args: { param: string }) => {
        return args.param
      },
      message: 'should pass arguments to the page function',
    })
    expect(await resultJSHandle.jsonValue()).toBe('test')
  })

  test('should poll with polling parameter until the function returns a truthy value', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    const resultJSHandle = await waitForFunction(page, {
      evaluateFn: () => {
        interface Window extends Global {
          attemptCount: number
        }
        const win = window as unknown as Window
        if (win.attemptCount === undefined) {
          win.attemptCount = 0
        }
        if (win.attemptCount < 10) {
          win.attemptCount += 1
        }

        // will poll until the attemptCount is 10 as the waitForFunction needs to return a truthy value
        return win.attemptCount === 10 ? win.attemptCount : false
      },
      message: 'should poll until the function returns a truthy value',
      polling: 10,
      timeoutMs: 1000,
    })
    expect(await resultJSHandle.jsonValue()).toBe(10)
  })

  test('should not poll if the polling and timeout are the same', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    try {
      await waitForFunction(page, {
        evaluateFn: () => {
          interface Window extends Global {
            attemptCount: number
          }
          const win = window as unknown as Window
          if (win.attemptCount === undefined) {
            win.attemptCount = 0
          }
          win.attemptCount += 1
          return win.attemptCount === 10 ? win.attemptCount : false
        },
        message: 'should not poll if the polling and timeout are the same',
        polling: 1000,
        timeoutMs: 1000,
      })
    } catch (error) {
      // should throw a timeout error as the truthy value is not returned within the timeout
      expect(error.message).toContain(
        'TimeoutError: page.waitForFunction: Timeout 1000ms exceeded'
      )
    }
  })
})

test.describe('expectPageEvalToPass', () => {
  test('should resolve when the page evaluation passes', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    const result = await expectPageEvalToPass(page, {
      evaluateFn: () => true,
      assertionFn: (result) => {
        expect(result).toBe(true)
      },
      message: 'pass - resolve when the function returns a truthy value',
    })

    expect(result).toBe(true)

    // with promise
    const result2 = await expectPageEvalToPass(page, {
      evaluateFn: () => Promise.resolve(true),
      assertionFn: (result) => {
        expect(result).toBe(true)
      },
      message: 'pass - resolve when the function returns a truthy value',
    })
    expect(result2).toBe(true)
  })

  test('should throw when the evaluateFn throws an error', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    await expect(
      expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise((_resolve, reject) => {
            setTimeout(() => {
              reject(new Error('test error'))
            }, 100)
          })
        },
        assertionFn: (result: unknown) => {
          // should not be called because the evaluateFn throws an error
          expect(result).not.toBeInstanceOf(Error)
          expect(result).not.toMatchObject({
            message: 'test error',
          })
          // should never pass to ensure expect().toPass() does not resolve
          expect(false).toBe(true)
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
      evaluateArgs: {
        param: 'test',
        param2: false,
        param3: 123,
        param4: {},
      },
      evaluateFn: (params) => {
        return params
      },
      assertionFn: (result) => {
        expect(result).toMatchObject({
          param: 'test',
          param2: false,
          param3: 123,
          param4: {},
        })
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
        evaluateFn: () => {
          return new Promise((resolve) =>
            setTimeout(() => resolve('should not resolve'), 5000)
          )
        },
        assertionFn: (result) => {
          // should never be called
          expect(result).not.toMatch('should not resolve')
        },
        message: 'timeout - should timeout when page evaluation takes too long',
        timeoutMs: 100,
      })
    ).rejects.toThrow(
      'timeout - should timeout when page evaluation takes too long'
    )
  })

  test('should poll at multiple times if the intervals are different from the timeout', async ({
    createCustomPage,
  }) => {
    let attemptCount = 0
    const page = await createCustomPage({ name: '[page]' })

    const result = await expectPageEvalToPass(page, {
      evaluateArgs: {
        attemptCount,
      },
      evaluateFn: () => {
        return 'anything'
      },
      assertionFn: () => {
        // increment attemptCount when the assertionFn is called
        attemptCount++
        // this assertion should fail and trigger the polling until it succeeds
        expect(attemptCount).toBe(10)
      },
      message:
        'should poll at least twice if the intervals are different from the timeout',
      intervals: [10],
      timeoutMs: 1000,
    })

    // should return the result of the evaluateFn
    expect(result).toBe('anything')
  })

  test('it should poll only once if the intervals and timeout are the same', async ({
    createCustomPage,
  }) => {
    let attemptCount = 0
    const page = await createCustomPage({ name: '[page]' })
    try {
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          return 'anything'
        },
        assertionFn: (result) => {
          // should only be called once
          attemptCount++
          // this assertion should fail and trigger the polling
          expect(result).toBe('should not resolve')
        },
        message:
          'should poll only once if the intervals and timeout are the same',
        intervals: [1000],
        timeoutMs: 1000,
      })
    } catch (error) {
      // should throw an error due to the timeout
      expect(error.message).toContain(
        'Timeout 1000ms exceeded while waiting on the predicate'
      )
    }
    expect(attemptCount).toBe(1)
  })

  test('should pass with serializable results', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    // Test various serializable return types
    const serializableResults = [
      { value: 'string', expected: 'string' },
      { value: 42, expected: 42 },
      { value: true, expected: true },
      { value: null, expected: null },
      { value: { key: 'value' }, expected: { key: 'value' } },
      { value: [1, 2, 3], expected: [1, 2, 3] },
      {
        value: { nested: { data: [1, 2] } },
        expected: { nested: { data: [1, 2] } },
      },
    ]

    for (const { value, expected } of serializableResults) {
      const result = await expectPageEvalToPass(page, {
        evaluateArgs: value,
        evaluateFn: (val) => val,
        assertionFn: (result) => {
          expect(result).toEqual(expected)
        },
        message: `should pass with serializable ${typeof value} result`,
      })
      expect(result).toEqual(expected)
    }
  })

  test.fixme('should throw error for non-serializable results', async ({}) => {
    // TODO: add tests for non-serializable results
  })

  test('should accept types that Playwright converts', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })

    // Test function return (gets converted to undefined)
    const functionResult = await expectPageEvalToPass(page, {
      evaluateFn: () => () => 'I am a function',
      assertionFn: (result) => {
        expect(result).toBeUndefined()
      },
      message: 'should accept function result',
    })
    expect(functionResult).toBeUndefined()

    // Test Symbol return (gets converted to undefined)
    const symbolResult = await expectPageEvalToPass(page, {
      evaluateFn: () => Symbol('test'),
      assertionFn: (result) => {
        expect(result).toBeUndefined()
      },
      message: 'should accept symbol result',
    })
    expect(symbolResult).toBeUndefined()

    // Test Date return (gets returned as a Date object)
    const dateResult = await expectPageEvalToPass(page, {
      evaluateFn: () => new Date('2023-01-01'),
      assertionFn: (result) => {
        expect(typeof result).toBe('object')
        expect(result).toBeInstanceOf(Date)
        expect((result as Date).toISOString()).toBe('2023-01-01T00:00:00.000Z')
      },
      message: 'should accept Date result',
    })
    expect((dateResult as Date).toISOString()).toBe('2023-01-01T00:00:00.000Z')

    // Test RegExp return (gets returned as RegExp object)
    const regExpResult = await expectPageEvalToPass(page, {
      evaluateFn: () => /test/gi,
      assertionFn: (result) => {
        expect(typeof result).toBe('object')
        expect(result).toBeInstanceOf(RegExp)
        expect(String(result)).toBe('/test/gi')
      },
      message: 'should accept RegExp result',
    })
    expect(regExpResult).toBeInstanceOf(RegExp)
  })
})
