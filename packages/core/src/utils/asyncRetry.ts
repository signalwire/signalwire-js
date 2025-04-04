import { getLogger } from '../utils/logger'

const DEFAULT_MAX_RETRIES = 10
const DEFAULT_INITIAL_DELAY = 100
const DEFAULT_DELAY_VARIATION = 1

interface AsyncRetryOptions<T> {
  asyncCallable: () => Promise<T>
  maxRetries?: number
  delayFn?: () => number
  validator?: (promiseResult: T) => void | never
  expectedErrorHandler?: (error: any) => boolean
}

interface DelayOptions {
  initialDelay?: number
  variation?: number
  delayLimit?: number
}

export const increasingDelay = ({
  delayLimit: upperDelayLimit = Number.MAX_SAFE_INTEGER,
  initialDelay = DEFAULT_INITIAL_DELAY,
  variation = DEFAULT_DELAY_VARIATION,
}: DelayOptions) => {
  if (initialDelay < 0 || upperDelayLimit < 0 || variation < 0) {
    throw new Error('No Negative Numbers')
  }
  if (initialDelay > upperDelayLimit) {
    throw new Error('initialDelay must be lte delayLimit')
  }

  let delay = Math.min(initialDelay, upperDelayLimit)
  return () => {
    if (delay === upperDelayLimit) {
      // stop incrementing the delay and just return upperDelayLimit
      return upperDelayLimit
    }
    const currentDelay = delay
    delay = Math.min(delay + variation, upperDelayLimit)

    return currentDelay
  }
}

export const decreasingDelay = ({
  delayLimit: bottomDelayLimit = 0,
  initialDelay = DEFAULT_INITIAL_DELAY,
  variation = DEFAULT_DELAY_VARIATION,
}: DelayOptions) => {
  if (initialDelay < 0 || bottomDelayLimit < 0 || variation < 0) {
    throw new Error('No Negative Numbers')
  }
  if (initialDelay < bottomDelayLimit) {
    throw new Error('initialDelay must be gte delayLimit')
  }

  let delay = Math.max(initialDelay, bottomDelayLimit)

  return () => {
    if (delay === bottomDelayLimit) {
      // stop incrementing the delay and just return upperDelayLimit
      return bottomDelayLimit
    }
    const currentDelay = delay
    delay = Math.max(delay - variation, bottomDelayLimit)

    return currentDelay
  }
}

export const constDelay = ({
  initialDelay = DEFAULT_INITIAL_DELAY,
}: Pick<DelayOptions, 'initialDelay'>) => {
  if (initialDelay < 0) {
    throw new Error('No Negative Numbers')
  }
  return () => initialDelay
}

export const asyncRetry = async <T>({
  asyncCallable,
  maxRetries: retries = DEFAULT_MAX_RETRIES,
  delayFn,
  validator,
  expectedErrorHandler,
}: AsyncRetryOptions<T>): Promise<T> => {
  let remainingAttempts = retries - 1 // the 1st call counts as an attempt
  let wait = 0

  const promiseAttempt = async () => {
    try {
      let result: Awaited<T>

      // Should not defer the call when: wait <= 0
      if (wait <= 0) {
        result = await asyncCallable()
      } else {
        result = await new Promise<T>((resolve, reject) =>
          setTimeout(() => {
            asyncCallable().then(resolve).catch(reject)
          }, wait)
        )
      }

      if (remainingAttempts) {
        // avoid messing with the normal returns in the last attempt
        validator?.(result)
      }

      return result
    } catch (error) {
      if (remainingAttempts-- > 0 && !expectedErrorHandler?.(error)) {
        wait = delayFn?.() ?? 0
        getLogger().debug(
          `Retrying request: ${retries - remainingAttempts} of ${retries}`
        )
        return promiseAttempt()
      } else {
        throw error
      }
    }
  }

  return promiseAttempt()
}
