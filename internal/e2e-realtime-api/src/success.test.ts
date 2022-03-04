import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>((resolve) => {
    setTimeout(() => resolve(0), 2000)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'test-success',
    testHandler: handler,
  })

  await runner.run()
}

main()
