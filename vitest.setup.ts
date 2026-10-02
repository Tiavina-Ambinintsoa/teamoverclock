import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for theme/responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
declare global {
  interface Window {
    IntersectionObserver: any
  }
}

window.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any
