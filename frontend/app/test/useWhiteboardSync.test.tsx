import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

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

// The real Excalidraw package needs a canvas, which jsdom does not provide. This stand-in applies
// the same rule as the real reconcileElements: the higher version wins, a tie goes to the lower
// versionNonce, and the local copy stays when it wins. It skips the "element is being edited" case.
vi.mock('@excalidraw/excalidraw', () => ({
    CaptureUpdateAction: { NEVER: 'NEVER' },
    restoreElements: (elements: unknown[]) => elements,
    reconcileElements: (local: any[], remote: any[]) => {
        const result = new Map<string, any>()
        const byId = new Map(local.map((e) => [e.id, e]))
        for (const r of remote) {
            const l = byId.get(r.id)
            const keepLocal =
                l &&
                (l.version > r.version ||
                    (l.version === r.version && l.versionNonce < r.versionNonce))
            result.set(r.id, keepLocal ? l : r)
        }
        for (const l of local) if (!result.has(l.id)) result.set(l.id, l)
        return [...result.values()]
    },
}))

import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { SidebarProvider, useSidebar } from '~/components/ui/sidebar'

// A small stateful stand-in for the Excalidraw API: updateScene replaces the scene,
// so the real reconcileElements runs against what the hook wrote before.
function makeExcalidrawAPIMock(initial: any[] = []) {
    const api = {
        scene: initial as any[],
        files: {} as Record<string, unknown>,
        updateScene: vi.fn((update: { elements?: any[]; captureUpdate?: string }) => {
            if (update.elements) api.scene = [...update.elements]
        }),
        addFiles: vi.fn(),
        refresh: vi.fn(),
        getSceneElementsIncludingDeleted: vi.fn(() => api.scene),
        getFiles: vi.fn(() => api.files),
        getAppState: vi.fn().mockReturnValue({
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 },
        }),
    }
    return api
}

const el = (id: string, version: number, versionNonce = 1, extra = {}) => ({
    id,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    angle: 0,
    strokeColor: '#000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    index: `a${id}`,
    version,
    versionNonce,
    ...extra,
})

const send = (message: unknown) =>
    act(() => {
        lastWs!.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
    })

const openSocket = () =>
    act(() => {
        lastWs!.readyState = MockWebSocket.OPEN
        lastWs!.onopen?.(new Event('open'))
    })

// Excalidraw loads through a dynamic import and applies on the next animation frame.
const attachApi = async (
    result: { current: { setExcalidrawAPI: (api: any) => void } },
    api: any,
) => {
    act(() => result.current.setExcalidrawAPI(api))
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
    })
}

const sentMessages = () =>
    (lastWs!.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => JSON.parse(c[0] as string))

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

    describe('sync on connect', () => {
        it('sends sync with the versions and file ids of the local scene when the socket opens', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('a', 3, 7), el('b', 1, 2)])
            api.files = { f1: { id: 'f1' } }
            await attachApi(result, api)

            openSocket()

            expect(sentMessages()).toEqual([
                { type: 'sync', versions: { a: [3, 7], b: [1, 2] }, fileIds: ['f1'] },
            ])
        })

        it('sends sync with an empty map when Excalidraw is not ready yet', () => {
            renderHook(() => useWhiteboardSync('apt-123'))

            openSocket()

            expect(sentMessages()).toEqual([{ type: 'sync', versions: {}, fileIds: [] }])
        })

        it('merges the sync reply into the scene without clearing the undo history', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('local', 1)])
            await attachApi(result, api)
            openSocket()

            send({ type: 'sync_reply', elements: [el('remote', 1)], want: [], wantFiles: [] })

            expect(api.updateScene).toHaveBeenCalledTimes(1)
            expect(api.updateScene.mock.calls[0]![0].captureUpdate).toBe('NEVER')
            expect(api.scene.map((e) => e.id).sort()).toEqual(['local', 'remote'])
        })

        it('buffers messages that arrive before Excalidraw is ready and applies them in order', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            openSocket()
            send({ type: 'sync_reply', elements: [el('a', 1)], want: [], wantFiles: [] })
            send({ type: 'elements', elements: [el('a', 2)] })

            const api = makeExcalidrawAPIMock()
            await attachApi(result, api)

            expect(api.scene.map((e) => `${e.id}@${e.version}`)).toEqual(['a@2'])
        })
    })

    describe('remote elements', () => {
        it('keeps a local element that is newer than the remote one', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('a', 5, 1, { x: 99 })])
            await attachApi(result, api)
            openSocket()

            send({ type: 'elements', elements: [el('a', 2, 1, { x: 1 })] })

            expect(api.scene[0]).toMatchObject({ id: 'a', version: 5, x: 99 })
        })

        it('keeps both strokes when two users draw at the same time', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('mine', 1)])
            await attachApi(result, api)
            openSocket()

            send({ type: 'elements', elements: [el('theirs', 1)] })

            expect(api.scene.map((e) => e.id).sort()).toEqual(['mine', 'theirs'])
        })

        it('adds files from a files message', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock()
            await attachApi(result, api)
            openSocket()
            const files = { 'file-2': { id: 'file-2', dataURL: 'data:image/png;base64,...' } }

            send({ type: 'files', files })

            expect(api.addFiles).toHaveBeenCalledWith(Object.values(files))
        })
    })

    describe('cursor and leave messages', () => {
        it('tracks cursors by connection id and removes them on leave', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            send({
                type: 'cursor',
                x: 100,
                y: 200,
                userId: 'user-999',
                userName: 'Ann',
                connectionId: 'conn-1',
            })
            send({ type: 'cursor', x: 1, y: 2, userId: 'user-999', connectionId: 'conn-2' })

            expect(result.current.remoteCursors.get('conn-1')).toEqual({
                x: 100,
                y: 200,
                name: 'Ann',
            })
            expect(result.current.remoteCursors.size).toBe(2)

            send({ type: 'leave', userId: 'user-999', connectionId: 'conn-1' })

            expect(result.current.remoteCursors.has('conn-1')).toBe(false)
            expect(result.current.remoteCursors.has('conn-2')).toBe(true)
        })
    })

    describe('onWhiteboardChange', () => {
        const syncedHook = async (scene: any[] = []) => {
            const hook = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock(scene)
            await attachApi(hook.result, api)
            openSocket()
            send({ type: 'sync_reply', elements: [], want: [], wantFiles: [] })
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()
            return { ...hook, api }
        }

        it('sends only changed elements, as a delta', async () => {
            const { result } = await syncedHook()

            act(() => {
                result.current.onWhiteboardChange([el('a', 1)] as any, {} as any, {})
            })

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('a', 1)] }])
        })

        it('does not send an element again until its version changes', async () => {
            const { result } = await syncedHook()
            act(() => {
                result.current.onWhiteboardChange([el('a', 1)] as any, {} as any, {})
            })
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 80))
            })
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()

            act(() => {
                result.current.onWhiteboardChange([el('a', 1), el('b', 1)] as any, {} as any, {})
            })

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('b', 1)] }])
        })

        it('does not echo an element that it just received', async () => {
            const { result } = await syncedHook()
            send({ type: 'elements', elements: [el('remote', 4)] })

            act(() => {
                result.current.onWhiteboardChange([el('remote', 4)] as any, {} as any, {})
            })

            expect(sentMessages()).toEqual([])
        })

        it('sends no elements for an empty scene', async () => {
            const { result } = await syncedHook()

            act(() => {
                result.current.onWhiteboardChange([] as any, {} as any, {})
            })

            expect(sentMessages()).toEqual([])
        })

        it('sends new files before the elements, and each file once', async () => {
            const { result } = await syncedHook()
            const file = { id: 'file-a', dataURL: 'data:image/png;base64,aaa' }

            act(() => {
                result.current.onWhiteboardChange([el('a', 1)] as any, {} as any, {
                    'file-a': file as any,
                })
            })
            expect(sentMessages().map((m) => m.type)).toEqual(['files', 'elements'])

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 80))
            })
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()
            act(() => {
                result.current.onWhiteboardChange([el('a', 2)] as any, {} as any, {
                    'file-a': file as any,
                })
            })
            expect(sentMessages().map((m) => m.type)).toEqual(['elements'])
        })

        it('holds local changes until the sync reply arrives', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            openSocket()
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()

            act(() => {
                result.current.onWhiteboardChange([el('a', 1)] as any, {} as any, {})
            })
            expect(sentMessages()).toEqual([])

            await attachApi(result, makeExcalidrawAPIMock([el('a', 1)]))
            send({ type: 'sync_reply', elements: [], want: ['a'], wantFiles: [] })

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('a', 1)] }])
        })

        it('sends the elements that the server wants after a sync reply', async () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('offline', 2), el('known', 1)])
            await attachApi(result, api)
            openSocket()
            act(() => {
                result.current.onWhiteboardChange(api.scene as any, {} as any, {})
            })
            ;(lastWs!.send as ReturnType<typeof vi.fn>).mockClear()

            send({ type: 'sync_reply', elements: [], want: ['offline'], wantFiles: [] })

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('offline', 2)] }])
        })

        it('does not send if WS is not open', () => {
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))

            act(() => {
                result.current.onWhiteboardChange([el('a', 1)] as any, {} as any, {})
            })

            expect(lastWs!.send).not.toHaveBeenCalled()
        })
    })

    describe('reconnect', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('opens a new socket after an unexpected close and syncs again', () => {
            renderHook(() => useWhiteboardSync('apt-123'))
            openSocket()
            const first = lastWs

            act(() => {
                lastWs!.readyState = MockWebSocket.CLOSED
                lastWs!.onclose?.(new CloseEvent('close', { code: 1006 }))
            })
            expect(constructorCallCount).toBe(1)

            act(() => {
                vi.advanceTimersByTime(1000)
            })
            expect(constructorCallCount).toBe(2)
            expect(lastWs).not.toBe(first)

            openSocket()
            expect(sentMessages()).toEqual([{ type: 'sync', versions: {}, fileIds: [] }])
        })

        it.each([
            [1008, 'rejected by the server'],
            [1000, 'closed because the appointment ended'],
        ])('does not reconnect after close code %i (%s)', (code) => {
            renderHook(() => useWhiteboardSync('apt-123'))
            openSocket()

            act(() => {
                lastWs!.readyState = MockWebSocket.CLOSED
                lastWs!.onclose?.(new CloseEvent('close', { code }))
            })
            act(() => {
                vi.advanceTimersByTime(30_000)
            })

            expect(constructorCallCount).toBe(1)
        })

        it('does not reconnect after unmount', () => {
            const { unmount } = renderHook(() => useWhiteboardSync('apt-123'))
            openSocket()
            act(() => {
                lastWs!.readyState = MockWebSocket.CLOSED
                lastWs!.onclose?.(new CloseEvent('close', { code: 1006 }))
            })

            unmount()
            act(() => {
                vi.advanceTimersByTime(30_000)
            })

            expect(constructorCallCount).toBe(1)
        })

        it('holds local changes while disconnected and sends them after the next sync reply', async () => {
            vi.useRealTimers()
            const { result } = renderHook(() => useWhiteboardSync('apt-123'))
            const api = makeExcalidrawAPIMock([el('a', 1)])
            await attachApi(result, api)
            openSocket()
            send({ type: 'sync_reply', elements: [], want: [], wantFiles: [] })

            // The socket drops. The user keeps drawing.
            act(() => {
                lastWs!.readyState = MockWebSocket.CLOSED
                lastWs!.onclose?.(new CloseEvent('close', { code: 1006 }))
            })
            act(() => {
                result.current.onWhiteboardChange(
                    [el('a', 1), el('offline', 1)] as any,
                    {} as any,
                    {},
                )
            })
            const firstWs = lastWs!
            expect(firstWs.send).toHaveBeenCalledTimes(1) // only the first sync

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1100))
            })
            expect(lastWs).not.toBe(firstWs)
            openSocket()
            expect(sentMessages()[0]).toMatchObject({ type: 'sync' })
            send({ type: 'sync_reply', elements: [], want: ['offline'], wantFiles: [] })

            expect(
                sentMessages()
                    .filter((m) => m.type === 'elements')
                    .flatMap((m) => m.elements.map((e: any) => e.id)),
            ).toContain('offline')
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

    describe('sidebar toggle', () => {
        function renderInsideSidebar() {
            return renderHook(
                () => ({ sync: useWhiteboardSync('apt-123'), sidebar: useSidebar() }),
                { wrapper: SidebarProvider },
            )
        }

        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('refreshes Excalidraw offsets once after the sidebar transition ends', () => {
            const api = makeExcalidrawAPIMock()
            const { result } = renderInsideSidebar()
            act(() => result.current.sync.setExcalidrawAPI(api as any))

            act(() => result.current.sidebar.toggleSidebar())
            expect(api.refresh).not.toHaveBeenCalled()

            act(() => {
                vi.advanceTimersByTime(300)
            })
            expect(api.refresh).toHaveBeenCalledTimes(1)
        })

        it('does not refresh on mount', () => {
            const api = makeExcalidrawAPIMock()
            const { result } = renderInsideSidebar()
            act(() => result.current.sync.setExcalidrawAPI(api as any))

            act(() => {
                vi.advanceTimersByTime(1000)
            })
            expect(api.refresh).not.toHaveBeenCalled()
        })
    })
})
