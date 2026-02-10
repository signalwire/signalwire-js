import { setupServer } from 'msw/node'
import { handlers } from './rest'

export const server = setupServer(...handlers)
