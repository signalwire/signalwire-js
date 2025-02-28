import { asyncRetry, constDelay, decreasingDelay, increasingDelay } from './asyncRetry'

describe('retriablePromise', () => {
  describe('Delay Constructors', () => {
    it('Should increase by default', () => {
      const delayFn = increasingDelay({ initialDelay: 10 })
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(11)
      expect(delayFn()).toEqual(12)
    })
    it('Should increase by 10', () => {
      const delayFn = increasingDelay({ initialDelay: 10, variation: 10 })
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(30)
    })
    it('Should NOT increase more than 20', () => {
      const delayFn = increasingDelay({
        initialDelay: 10,
        variation: 10,
        capDelay: 20,
      })
      expect(delayFn()).toEqual(10)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(20)
    })
    it('Should decrease by default', () => {
      const delayFn = decreasingDelay({ initialDelay: 30 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(29)
      expect(delayFn()).toEqual(28)
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
    it('Should NOT decrease more than 20', () => {
      const delayFn = decreasingDelay({
        initialDelay: 30,
        variation: 10,
        capDelay: 20,
      })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(20)
      expect(delayFn()).toEqual(20)
    })
    it('Should always return the same delay', () => {
      const delayFn = constDelay({ initialDelay: 30 })
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
      expect(delayFn()).toEqual(30)
    })
  })

  describe('retries', () => {
    const delayFn = increasingDelay({initialDelay: 10})
    it('Should not throw and execute with no delay or retries', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() => Promise.resolve())

      await asyncRetry({ asyncCallable: callableSpy, delayFn: delaySpy })
      expect(callableSpy).toHaveBeenCalledTimes(1)
      expect(delaySpy).not.toHaveBeenCalled()
    })

    it('Should throw ONLY after the retries is busted', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() =>
        Promise.reject(new Error('Good Error Message'))
      )

      try {
        await asyncRetry({ asyncCallable: callableSpy, delayFn: delaySpy })
        throw new Error('Bad Error Message')
      } catch (error) {
        expect(callableSpy).toHaveBeenCalledTimes(10)
        expect(delaySpy).toHaveBeenCalledTimes(9)
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Good Error Message')
      }
    })

    it('Should throw with no retries', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() =>
        Promise.reject(new Error('Good Error Message'))
      )

      try {
        await asyncRetry({
          asyncCallable: callableSpy,
          delayFn: delaySpy,
          retries: 0,
        })
        throw new Error('Bad Error Message')
      } catch (error) {
        expect(callableSpy).toHaveBeenCalledTimes(1)
        expect(delaySpy).not.toHaveBeenCalled()
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Good Error Message')
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

    it('Should throw a validator exception transparently', async () => {
      const delaySpy = jest.fn(() => delayFn())
      const callableSpy = jest.fn(() => Promise.resolve({ ok: false }))
      const validatorSpy = jest.fn((result: { ok: boolean }) => {
        if (!result.ok) {
          throw new Error('Validation Error')
        }
      })

      
      await asyncRetry({ asyncCallable: callableSpy, delayFn: delaySpy, validator: validatorSpy })
      
      
      expect(callableSpy).toHaveBeenCalledTimes(10)
      expect(delaySpy).toHaveBeenCalledTimes(9)
      expect(validatorSpy).toHaveBeenCalledTimes(9)
      expect(validatorSpy).not.toHaveReturned()
        
    })
  })
})
