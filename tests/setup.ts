// Vitest setup file
// Add any global test setup here

import { vi } from 'vitest'

// Mock the logger module
vi.mock('../src/utils/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))
