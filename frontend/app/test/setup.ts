import '@testing-library/jest-dom'

// Polyfill ResizeObserver for Radix UI components that depend on it
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
