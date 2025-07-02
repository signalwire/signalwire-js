import {
  asyncRetry,
  constDelay,
  decreasingDelay,
  increasingDelay,
} from './asyncRetry'

const CONST_DELAY_INTERVAL = 100
const DELAY_INCREMENT = 100

describe('asyncRetry', () => {
  describe('Delay Builders', () => {

    it('Should not accepted invalid params', () => {
      expect(() => increasingDelay({initialDelay: -1})).toThrow()
      expect(() => increasingDelay({delayLimit: -1})).toThrow()
      expect(() => increasingDelay({variation: -1})).toThrow()
      expect(() => increasingDelay({variation: -1, initialDelay: -1, delayLimit: -1})).toThrow()
      expect(() => decreasingDelay({initialDelay: -1})).toThrow()
      expect(() => decreasingDelay({delayLimit: -1})).toThrow()
      expect(() => decreasingDelay({variation: -1})).toThrow()
      expect(() => decreasingDelay({variation: -1, initialDelay: -1, delayLimit: -1})).toThrow()
      expect(() => constDelay({initialDelay: -1})).toThrow()

      expect(() => increasingDelay({initialDelay: 50, delayLimit: 10})).toThrow()
      expect(() => decreasingDelay({initialDelay: 10, delayLimit: 50})).toThrow()
    })
    it('Should increase by default', () => {
      const delayFn = increasingDelay({ })
      expect(delayFn()).toEqual(100)
      expect(delayFn()).toEqual(101)
      expect(delayFn()).toEqual(102)
    })
    it('Should increase by 10', () => {
      const delayFn = increasingDelay({ initialDelay: 10, variation: 10 })
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(30)
    })
    it('should NOT increase more than 30 with smaller variation', () => {
      const delayFn = increasingDelay({
        initialDelay: 10,
        variation: 8,
        delayLimit: 30,
      })
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(18)
      expect(delayFn()).toEqual(26)
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
    })
    it('Should NOT increase more than 30 again', () => {
      const delayFn = increasingDelay({
        initialDelay: 20,
        variation: 35,
        delayLimit: 30,
      })
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
    })
    it('Should decrease by default', () => {
      const delayFn = decreasingDelay({})
      expect(delayFn()).toEqual(100)
      expect(delayFn()).toEqual(99)
      expect(delayFn()).toEqual(98)
    })
    it('Should decrease by 10', () => {
      const delayFn = decreasingDelay({ initialDelay: 30, variation: 10 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(10)
    })
    it('Should NOT decrease more than 0 by default', () => {
      const delayFn = decreasingDelay({ initialDelay: 30, variation: 10 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(0)
      expect(delayFn()).toEqual(0)
    })
    it('should NOT decrease more than 0 by default', () => {
      const delayFn = decreasingDelay({ initialDelay: 30, variation: 9 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(21)
      expect(delayFn()).toEqual(12)
      expect(delayFn()).toEqual(3)
      expect(delayFn()).toEqual(0)
    })
    it('should NOT decrease more less 20', () => {
      const delayFn = decreasingDelay({
        initialDelay: 30,
        variation: 10,
        delayLimit: 20,
      })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(20)
    })
    it('Should NOT decrease more than 20 again', () => {
      const delayFn = decreasingDelay({
        initialDelay: 30,
        variation: 40,
        delayLimit: 20,
      })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(20)
    })
    it('Should NOT decrease more than 20 also', () => {
      const delayFn = decreasingDelay({
        initialDelay: 30,
        variation: 9,
        delayLimit: 20,
      })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(21)
      expect(delayFn()).toEqual(20)
    })
    it('Should always return the same delay', () => {
      const delayFn = constDelay({ initialDelay: 30 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
    })
    it('Should constant by default', () => {
      const delayFn = constDelay({})
      expect(delayFn()).toEqual(100)
      expect(delayFn()).toEqual(100)
      expect(delayFn()).toEqual(100)
    })
  })

  describe('retries', () => {
    const delayFn = increasingDelay({ initialDelay: DELAY_INCREMENT })
    const constDelayFn = constDelay({initialDelay: CONST_DELAY_INTERVAL})

    it('should call the promise without delay function and maximum retries', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() => Promise.resolve())

      await asyncRetry({ asyncCallable: callableSpy, delayFn: delaySpy })
      expect(callableSpy).toHaveBeenCalledTimes(1)
      expect(delaySpy).not.toHaveBeenCalled()
    })

    test('should work work with no delay function', async () => {
      const mockAsyncCallable = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValue('success')

      const promise = asyncRetry({
        asyncCallable: mockAsyncCallable,
        maxRetries: 5,
      })
      
      await expect(promise).resolves.toBe('success')
      expect(mockAsyncCallable).toHaveBeenCalledTimes(2)
    })

    test('should not retry if error is expected', async () => {
      const mockAsyncCallable = jest
        .fn()
        .mockRejectedValueOnce(new Error('Expected Error'))
        .mockResolvedValue('success')

      const promise = asyncRetry({
        asyncCallable: mockAsyncCallable,
        maxRetries: 5,
        expectedErrorHandler:(error) => error.message === 'Expected Error'
      })
      
      await expect(() => promise).rejects.toEqual(new Error('Expected Error'))
      expect(mockAsyncCallable).toHaveBeenCalledTimes(1)
    })

    describe("With fake timers", () => {

      beforeEach(() => {
        jest.useFakeTimers()
      })
  
      afterEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
      })

      test('should retry and succeed on second attempt', async () => {
        const delaySpy = jest.fn(() => constDelayFn())
        const mockAsyncCallable = jest
          .fn()
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValue('success')
  
        const promise = asyncRetry({
          asyncCallable: mockAsyncCallable,
          maxRetries: 5,
          delayFn: delaySpy,
        })
  
        // First attempt fails
        await Promise.resolve()
        expect(mockAsyncCallable).toHaveBeenCalledTimes(1)
        expect(delaySpy).toHaveBeenCalledTimes(1)
  
        // Advance timer
        jest.advanceTimersByTime(CONST_DELAY_INTERVAL / 2)
  
        
        expect(mockAsyncCallable).toHaveBeenCalledTimes(1)
        expect(delaySpy).toHaveBeenCalledTimes(1)
  
        // Advance timer
        jest.advanceTimersByTime(CONST_DELAY_INTERVAL / 2)
        await Promise.resolve()
  

        await expect(promise).resolves.toBe('success')
        expect(mockAsyncCallable).toHaveBeenCalledTimes(2)
        expect(delaySpy).toHaveBeenCalledTimes(1)
      })

      test('should retry not expected exception ', async () => {
        const delaySpy = jest.fn(() => constDelayFn())
        const mockAsyncCallable = jest
          .fn()
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValue('success')
  
        const promise = asyncRetry({
          asyncCallable: mockAsyncCallable,
          maxRetries: 5,
          delayFn: delaySpy,
          expectedErrorHandler: (_) => false 
        })
  
        // First attempt fails
        await Promise.resolve()
        expect(mockAsyncCallable).toHaveBeenCalledTimes(1)
        expect(delaySpy).toHaveBeenCalledTimes(1)
  
        // Advance timer
        jest.advanceTimersByTime(CONST_DELAY_INTERVAL / 2)
  
        
        expect(mockAsyncCallable).toHaveBeenCalledTimes(1)
        expect(delaySpy).toHaveBeenCalledTimes(1)
  
        // Advance timer
        jest.advanceTimersByTime(CONST_DELAY_INTERVAL / 2)
        await Promise.resolve()
  

        await expect(promise).resolves.toBe('success')
        expect(mockAsyncCallable).toHaveBeenCalledTimes(2)
        expect(delaySpy).toHaveBeenCalledTimes(1)
      })

     

      it('Should throw a validator exception transparently', async () => {
        const delaySpy = jest.fn(() => constDelayFn())
        const callableSpy = 
        jest.fn(() => Promise.resolve({ ok: false }))
        const validatorSpy = jest.fn((result: { ok: boolean }) => {
          if (!result.ok) {
            throw new Error('Validation Error')
          }
        })
  
        const promise = asyncRetry({
          asyncCallable: callableSpy,
          delayFn: delaySpy,
          validator: validatorSpy,
        })

        await jest.runAllTimersAsync()
        
        expect(callableSpy).toHaveBeenCalledTimes(10)
        expect(delaySpy).toHaveBeenCalledTimes(9)

        expect(validatorSpy).toHaveBeenCalledTimes(9)

        expect(validatorSpy).not.toHaveReturned()

        await expect(promise).resolves.toEqual({"ok": false})
      })

      it('Should throw the real exception if fail the last attempt', async () => {
        const delaySpy = jest.fn(() => constDelayFn())
        const callableSpy = jest.fn(() =>
          Promise.reject(new Error('Real Callable Error - should be thrown'))
        )
        const validatorSpy = jest.fn((result: { ok: boolean }) => {
          if (!result.ok) {
            throw new Error('Validation Error')
          }
        })
  
        const promise = asyncRetry({
          asyncCallable: callableSpy,
          delayFn: delaySpy,
          validator: validatorSpy,
        })

        try {
        jest.runAllTimersAsync()
        
        
          await promise
        } catch (error) {

        expect(callableSpy).toHaveBeenCalledTimes(10)
        expect(delaySpy).toHaveBeenCalledTimes(9)

        expect(validatorSpy).toHaveBeenCalledTimes(0)
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Real Callable Error - should be thrown')
        await expect(() => promise).rejects.toEqual(new Error('Real Callable Error - should be thrown'))
        }
      })
      
    })

    

    it('Should throw with no retries', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() =>
        Promise.reject(new Error('Real Callable Error - should be thrown'))
      )

      try {
        await asyncRetry({
          asyncCallable: callableSpy,
          delayFn: delaySpy,
          maxRetries: 0,
        })
        throw new Error('This Error should not be thrown')
      } catch (error) {
        expect(callableSpy).toHaveBeenCalledTimes(1)
        expect(delaySpy).not.toHaveBeenCalled()
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Real Callable Error - should be thrown')
      }
    })

    it('Should not throw a validator exception', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() => Promise.resolve({ ok: true }))
      const validator = (result: { ok: boolean }) => {
        if (!result.ok) {
          throw new Error('Validation Error')
        }
      }

      const { ok } = await asyncRetry({
        asyncCallable: callableSpy,
        delayFn: delaySpy,
        validator,
      })
      expect(callableSpy).toHaveBeenCalledTimes(1)
      expect(delaySpy).not.toHaveBeenCalled()
      expect(ok).toEqual(true)
    })

  })
})
