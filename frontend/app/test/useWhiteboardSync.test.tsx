import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// WebSocket mock — jsdom does not provide a working WebSocket constructor.
// We define a class-based mock and track the most recently constructed instance via lastWs.

interface MockWSInstance {
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    readyState: number
    onopen: ((ev: Event) => void) | null
    onmessage: ((ev: MessageEvent) => void) | null
    onclose: ((ev: CloseEvent) => void) | null
    onerror: ((ev: Event) => void) | null
    url: string
}

let lastWs: MockWSInstance | null = null
let constructorCallCount = 0
let constructorLastUrl = ''

class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    send = vi.fn()
    close = vi.fn()
    readyState = MockWebSocket.CONNECTING
    onopen: ((ev: Event) => void) | null = null
    onmessage: ((ev: MessageEvent) => void) | null = null
    onclose: ((ev: CloseEvent) => void) | null = null
    onerror: ((ev: Event) => void) | null = null
    url: string

    constructor(url: string) {
        this.url = url
        constructorCallCount++
        constructorLastUrl = url
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastWs = this as any
    }
}

vi.stubGlobal('WebSocket', MockWebSocket)

import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'

function makeExcalidrawAPIMock() {
    return {
        updateScene: vi.fn(),
        addFiles: vi.fn(),
        getAppState: vi.fn().mockReturnValue({
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 },
        }),
    }
}

describe('useWhiteboardSync', () => {
    beforeEach(() => {
        lastWs = null
        constructorCallCount = 0
        constructorLastUrl = ''
    })

    it('constructs WebSocket with the correct URL derived from VITE_API_URL', () => {
        renderHook(() => useWhiteboardSync('apt-123'))

        expect(constructorCallCount).toBe(1)
        expect(constructorLastUrl).toBe('ws://localhost:3000/api/whiteboard/apt-123')
    })

    it('sets connected to true when WS onopen fires', () => {
        const { result } = renderHook(() => useWhiteboardSync('apt-123'))

        expect(result.current.connected).toBe(false)

        act(() => {
            lastWs!.readyState = MockWebSocket.OPEN
            lastWs!.onopen?.(new Event('open'))
        })

        expect(result.current.connected).toBe(true)
    })

    it('sets connected to false and clears remoteCursors when WS onclose fires', () => {
        const { result } = renderHook(() => useWhiteboardSync('apt-123'))

        act(() => {
            lastWs!.readyState = MockWebSocket.OPEN
            lastWs!.onopen?.(new Event('open'))
        })

        expect(result.current.connected).toBe(true)

        act(() => {
            lastWs!.readyState = MockWebSocket.CLOSED
            lastWs!.onclose?.(new CloseEvent('close'))
        })

        expect(result.current.connected).toBe(false)
        expect(result.current.remoteCursors.size).toBe(0)
    })

    it('sets connected to false when WS onerror fires', () => {
        const { result } = renderHook(() => useWhiteboardSync('apt-123'))

        act(() => {
            lastWs!.readyState = MockWebSocket.OPEN
            lastWs!.onopen?.(new Event('open'))
        })

        act(() => {
            lastWs!.onerror?.(new Event('error'))
        })

        expect(result.current.connected).toBe(false)
    })

    describe('scene_init message', () => {
        it('calls excalidrawAPI.updateScene and addFiles with deserialized payload', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock()

            act(() => {
                result.current.setExcalidrawAPI(api as any)
            })

            const elements = [{ id: 'el1', type: 'rectangle' }]
            const files = { 'file-1': { id: 'file-1', dataURL: 'data:image/png;base64,...' } }

            act(() => {
                lastWs!.onmessage?.(
                    new MessageEvent('message', {
                        data: JSON.stringify({ type: 'scene_init', elements, files }),
                    }),
                )
            })

            expect(api.updateScene).toHaveBeenCalledWith({ elements })
            expect(api.addFiles).toHaveBeenCalledWith(Object.values(files))
        })
    })

    describe('elements message', () => {
        it('calls excalidrawAPI.updateScene with elements', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock()

            act(() => {
                result.current.setExcalidrawAPI(api as any)
            })

            const elements = [{ id: 'el2', type: 'ellipse' }]

            act(() => {
                lastWs!.onmessage?.(
                    new MessageEvent('message', {
                        data: JSON.stringify({ type: 'elements', elements }),
                    }),
                )
            })

            expect(api.updateScene).toHaveBeenCalledWith({ elements })
        })
    })

    describe('files message', () => {
        it('calls excalidrawAPI.addFiles with the file values', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock()

            act(() => {
                result.current.setExcalidrawAPI(api as any)
            })

            const files = { 'file-2': { id: 'file-2', dataURL: 'data:image/png;base64,...' } }

            act(() => {
                lastWs!.onmessage?.(
                    new MessageEvent('message', {
                        data: JSON.stringify({ type: 'files', files }),
                    }),
                )
            })

            expect(api.addFiles).toHaveBeenCalledWith(Object.values(files))
        })
    })

    describe('cursor message', () => {
        it('adds entry to remoteCursors with correct userId key', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            act(() => {
                lastWs!.onmessage?.(
                    new MessageEvent('message', {
                        data: JSON.stringify({
                            type: 'cursor',
                            x: 100,
                            y: 200,
                            userId: 'user-999',
                        }),
                    }),
                )
            })

            expect(result.current.remoteCursors.has('user-999')).toBe(true)
            expect(result.current.remoteCursors.get('user-999')).toEqual({ x: 100, y: 200 })
        })
    })

    describe('onWhiteboardChange', () => {
        it('sends { type: elements } over WS when WS is open', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            act(() => {
                lastWs!.readyState = MockWebSocket.OPEN
                lastWs!.onopen?.(new Event('open'))
            })

            const elements = [{ id: 'el3', type: 'text' }]

            act(() => {
                result.current.onWhiteboardChange(elements as any, {} as any, {})
            })

            expect(lastWs!.send).toHaveBeenCalledWith(
                JSON.stringify({ type: 'elements', elements }),
            )
        })

        it('sends { type: files } only for file IDs not previously sent', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            act(() => {
                lastWs!.readyState = MockWebSocket.OPEN
                lastWs!.onopen?.(new Event('open'))
            })

            const fileA = { id: 'file-a', dataURL: 'data:image/png;base64,aaa' }
            const fileB = { id: 'file-b', dataURL: 'data:image/png;base64,bbb' }

            // First call: both files are new
            act(() => {
                result.current.onWhiteboardChange([] as any, {} as any, {
                    'file-a': fileA as any,
                    'file-b': fileB as any,
                })
            })

            const sendCalls = (lastWs!.send as ReturnType<typeof vi.fn>).mock.calls as string[][]
            const filesSentCall = sendCalls.find((call) => {
                const parsed = JSON.parse(call[0]!)
                return parsed.type === 'files'
            })
            expect(filesSentCall).toBeDefined()

            const parsedFiles = JSON.parse(filesSentCall![0]!)
            expect(Object.keys(parsedFiles.files)).toContain('file-a')
            expect(Object.keys(parsedFiles.files)).toContain('file-b')

            // Reset send mock
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()

            // Second call: same files, should not send again
            act(() => {
                result.current.onWhiteboardChange([] as any, {} as any, {
                    'file-a': fileA as any,
                    'file-b': fileB as any,
                })
            })

            const sendCallsAfter = (lastWs!.send as ReturnType<typeof vi.fn>).mock
                .calls as string[][]
            const filesResentCall = sendCallsAfter.find((call) => {
                const parsed = JSON.parse(call[0]!)
                return parsed.type === 'files'
            })
            expect(filesResentCall).toBeUndefined()
        })

        it('does not send if WS is not open', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            // WS still in CONNECTING state (readyState = 0)
            act(() => {
                result.current.onWhiteboardChange([] as any, {} as any, {})
            })

            expect(lastWs!.send).not.toHaveBeenCalled()
        })
    })

    describe('onPointerUpdate', () => {
        it('sends { type: cursor, x, y } over WS when open', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            act(() => {
                lastWs!.readyState = MockWebSocket.OPEN
                lastWs!.onopen?.(new Event('open'))
            })

            act(() => {
                result.current.onPointerUpdate({
                    pointer: { x: 50, y: 75 },
                    button: 'none',
                })
            })

            expect(lastWs!.send).toHaveBeenCalledWith(
                JSON.stringify({ type: 'cursor', x: 50, y: 75 }),
            )
        })
    })

    it('calls ws.close on unmount', () => {
        const { unmount } = renderHook(() => useWhiteboardSync('apt-123'))

        unmount()

        expect(lastWs!.close).toHaveBeenCalled()
    })
})
