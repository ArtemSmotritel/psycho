import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Polyfill ResizeObserver for Radix UI components that depend on it
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// jsdom does not implement Worker — stub it so react-media-recorder / media-encoder-host loads
global.Worker = class Worker {
    constructor(_url: string | URL) {}
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
        return false
    }
} as unknown as typeof Worker

// jsdom does not implement MediaRecorder — stub it so react-media-recorder's mount-time
// `if (!window.MediaRecorder) throw new Error('Unsupported Browser')` check passes
class MediaRecorderStub {
    static isTypeSupported() {
        return true
    }
    state = 'inactive'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstart: (() => void) | null = null
    onstop: (() => void) | null = null
    onerror: (() => void) | null = null
    start() {}
    stop() {}
    pause() {}
    resume() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
        return false
    }
}
;(global as any).MediaRecorder = MediaRecorderStub
;(window as any).MediaRecorder = MediaRecorderStub

// jsdom does not implement window.matchMedia — stub it so SidebarProvider/useIsMobile works
Object.defineProperty(window, 'matchMedia', {
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
