import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

// jsdom doesn't implement these — components that preview uploaded files call them directly.
if (!URL.createObjectURL) {
  let counter = 0
  URL.createObjectURL = () => `blob:mock-${++counter}`
  URL.revokeObjectURL = () => {}
}
