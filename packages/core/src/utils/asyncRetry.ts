const DEFAULT_MAX_RETRIES = 10
const DEFAULT_INITIAL_DELAY = 100
const DEFAULT_DELAY_VARIATION = 1

interface AsyncRetryOptions<T> {
  asyncCallable: () => Promise<T>
  retries?: number
  delayFn?: () => number
  validator?: (promiseResult: T) => void | never
}

interface DelayOptions {
  initialDelay?: number
  variation?: number
  delayLimit?: number
}

export const increasingDelay = ({
  delayLimit: upperDelayLimit,
  initialDelay = DEFAULT_INITIAL_DELAY,
  variation = DEFAULT_DELAY_VARIATION,
}: DelayOptions) => {
  let delay: number
  return () => {
    if (upperDelayLimit && (delay >= upperDelayLimit)) {
      // stop incrementing the delay and just return upperDelayLimit
      return upperDelayLimit
    }
    delay = delay ? delay + variation : initialDelay
    delay =
      upperDelayLimit && delay >= upperDelayLimit ? upperDelayLimit : delay

    return delay
  }
}

export const decreasingDelay = ({
  delayLimit: bottomDelayLimit,
  initialDelay = DEFAULT_INITIAL_DELAY,
  variation = DEFAULT_DELAY_VARIATION,
}: DelayOptions) => {
  let delay: number
  return () => {
    if (delay === 0 || (bottomDelayLimit && delay <= bottomDelayLimit)) {
      // stop decrementing the delay and just return bottomDelayLimit or 0
      return bottomDelayLimit ?? 0
    }
    delay = delay ? delay - variation : initialDelay
    delay =
      bottomDelayLimit && delay <= bottomDelayLimit ? bottomDelayLimit : delay
    delay = delay < 0 ? 0 : delay

    return delay
  }
}

export const constDelay = ({
  initialDelay = DEFAULT_INITIAL_DELAY,
}: Pick<DelayOptions, 'initialDelay'>) => {
  return () => initialDelay
}

export const asyncRetry = async <T>({
  asyncCallable,
  retries = DEFAULT_MAX_RETRIES,
  delayFn,
  validator,
}: AsyncRetryOptions<T>): Promise<T> => {
  let remainingAttempts = retries - 1 // the 1st call counts as an attempt
  let wait = 0

  const promiseAttempt = async () => {
    try {
      const result = await (wait <= 0 // Should not defer the call when: wait <= 0
        ? asyncCallable()
        : new Promise<T>((resolve, reject) =>
            setTimeout(() => {
              asyncCallable()
                .then((r) => resolve(r))
                .catch((e) => reject(e))
            }, wait)
          ))

      if (remainingAttempts) {
        // avoid messing with the normal returns in the last attempt
        validator?.(result)
      }

      return result
    } catch (error) {
      if (remainingAttempts-- > 0) {
        wait = delayFn?.() ?? 0
        return promiseAttempt()
      } else {
        throw error
      }
    }
  }

  return promiseAttempt()
}
