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

// Excalidraw loads through a dynamic import and is ready on the next animation frame.
// The hook opens the socket only after that.
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

// Renders the hook and attaches the Excalidraw API, so the hook opens its socket.
const renderReady = async (scene: any[] = []) => {
    const hook = renderHook(() => useWhiteboardSync('apt-123'))
    const api = makeExcalidrawAPIMock(scene)
    await attachApi(hook.result, api)
    return { ...hook, api }
}

const closeSocket = (code = 1006) =>
    act(() => {
        lastWs!.readyState = MockWebSocket.CLOSED
        lastWs!.onclose?.(new CloseEvent('close', { code }))
    })

// The hook sends on a 50 ms interval, so a change goes out on the next tick.
const waitForTick = () =>
    act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120))
    })

const clearSent = () => (lastWs!.send as ReturnType<typeof vi.fn>).mockClear()

// Changes the mock scene and tells the hook, as Excalidraw does, then waits for the next tick.
const changeScene = async (
    hook: {
        result: { current: { onWhiteboardChange: () => void } }
        api: { scene: any[]; files: any }
    },
    elements: any[],
    files: Record<string, unknown> = {},
) => {
    hook.api.scene = elements
    hook.api.files = files
    act(() => hook.result.current.onWhiteboardChange())
    await waitForTick()
}

const sentElementIds = () =>
    sentMessages()
        .filter((m) => m.type === 'elements')
        .flatMap((m) => m.elements.map((e: any) => e.id))

describe('useWhiteboardSync', () => {
    beforeEach(() => {
        lastWs = null
        constructorCallCount = 0
        constructorLastUrl = ''
    })

    it('constructs WebSocket with the correct URL derived from VITE_API_URL', async () => {
        await renderReady()

        expect(constructorCallCount).toBe(1)
        expect(constructorLastUrl).toBe('ws://localhost:3000/api/whiteboard/apt-123')
    })

    it('does not open the socket until Excalidraw is ready', async () => {
        const { result } = renderHook(() => useWhiteboardSync('apt-123'))
        expect(constructorCallCount).toBe(0)

        await attachApi(result, makeExcalidrawAPIMock())

        expect(constructorCallCount).toBe(1)
    })

    it('sets connected to true when WS onopen fires', async () => {
        const { result } = await renderReady()

        expect(result.current.connected).toBe(false)
        openSocket()

        expect(result.current.connected).toBe(true)
    })

    it('sets connected to false and clears remoteCursors when WS onclose fires', async () => {
        const { result } = await renderReady()
        openSocket()
        expect(result.current.connected).toBe(true)

        closeSocket()

        expect(result.current.connected).toBe(false)
        expect(result.current.remoteCursors.size).toBe(0)
    })

    describe('sync on connect', () => {
        it('sends sync with the file ids of the local scene when the socket opens', async () => {
            const { api } = await renderReady([el('a', 3, 7)])
            api.files = { f1: { id: 'f1' } }

            openSocket()

            expect(sentMessages()).toEqual([{ type: 'sync', fileIds: ['f1'] }])
        })

        it('merges the sync reply into the scene without clearing the undo history', async () => {
            const { api } = await renderReady([el('local', 1)])
            openSocket()

            send({ type: 'sync_reply', elements: [el('remote', 1)], wantFiles: [] })

            expect(api.updateScene).toHaveBeenCalledTimes(1)
            expect(api.updateScene.mock.calls[0]![0].captureUpdate).toBe('NEVER')
            expect(api.scene.map((e) => e.id).sort()).toEqual(['local', 'remote'])
        })
    })

    describe('remote elements', () => {
        it('keeps a local element that is newer than the remote one', async () => {
            const { api } = await renderReady([el('a', 5, 1, { x: 99 })])
            openSocket()

            send({ type: 'elements', elements: [el('a', 2, 1, { x: 1 })] })

            expect(api.scene[0]).toMatchObject({ id: 'a', version: 5, x: 99 })
        })

        it('keeps both strokes when two users draw at the same time', async () => {
            const { api } = await renderReady([el('mine', 1)])
            openSocket()

            send({ type: 'elements', elements: [el('theirs', 1)] })

            expect(api.scene.map((e) => e.id).sort()).toEqual(['mine', 'theirs'])
        })

        it('adds files from a files message', async () => {
            const { api } = await renderReady()
            openSocket()
            const files = { 'file-2': { id: 'file-2', dataURL: 'data:image/png;base64,...' } }

            send({ type: 'files', files })

            expect(api.addFiles).toHaveBeenCalledWith(Object.values(files))
        })
    })

    describe('cursor and leave messages', () => {
        it('tracks cursors by connection id and removes them on leave', async () => {
            const { result } = await renderReady()
            openSocket()

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
            const hook = await renderReady(scene)
            openSocket()
            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            await waitForTick()
            clearSent()
            return hook
        }

        it('sends only changed elements, as a delta', async () => {
            const hook = await syncedHook()

            await changeScene(hook, [el('a', 1)])

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('a', 1)] }])
        })

        it('does not send an element again until its version changes', async () => {
            const hook = await syncedHook()
            await changeScene(hook, [el('a', 1)])
            clearSent()

            await changeScene(hook, [el('a', 1), el('b', 1)])

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('b', 1)] }])
        })

        it('sends nothing on a tick when nothing changed', async () => {
            const hook = await syncedHook()
            await changeScene(hook, [el('a', 1)])
            clearSent()

            await waitForTick()

            expect(sentMessages()).toEqual([])
        })

        it('does not echo an element that it just received', async () => {
            const hook = await syncedHook()
            send({ type: 'elements', elements: [el('remote', 4)] })

            act(() => hook.result.current.onWhiteboardChange())
            await waitForTick()

            expect(sentMessages()).toEqual([])
        })

        it('sends no elements for an empty scene', async () => {
            const hook = await syncedHook()

            await changeScene(hook, [])

            expect(sentMessages()).toEqual([])
        })

        it('sends new files before the elements, and each file once', async () => {
            const hook = await syncedHook()
            const file = { id: 'file-a', dataURL: 'data:image/png;base64,aaa' }

            await changeScene(hook, [el('a', 1)], { 'file-a': file })
            expect(sentMessages().map((m) => m.type)).toEqual(['files', 'elements'])
            clearSent()

            await changeScene(hook, [el('a', 2)], { 'file-a': file })
            expect(sentMessages().map((m) => m.type)).toEqual(['elements'])
        })

        it('sends each new file in its own message', async () => {
            const hook = await syncedHook()
            const fileA = { id: 'file-a', dataURL: 'data:image/png;base64,aaa' }
            const fileB = { id: 'file-b', dataURL: 'data:image/png;base64,bbb' }

            await changeScene(hook, [el('a', 1)], { 'file-a': fileA, 'file-b': fileB })

            expect(sentMessages().map((m) => m.type)).toEqual(['files', 'files', 'elements'])
            expect(sentMessages().map((m) => Object.keys(m.files ?? {}))).toEqual([
                ['file-a'],
                ['file-b'],
                [],
            ])
        })

        it('splits a large change into messages of at most 500 elements', async () => {
            const hook = await syncedHook()
            const many = Array.from({ length: 501 }, (_, i) => el(`e${i}`, 1))

            await changeScene(hook, many)

            expect(sentMessages().map((m) => m.elements.length)).toEqual([500, 1])
        })

        it('keeps a file above the size limit on this screen and sends the others', async () => {
            const hook = await syncedHook()
            const huge = { id: 'huge', dataURL: 'x'.repeat(8 * 1024 * 1024 + 1) }
            const small = { id: 'small', dataURL: 'data:image/png;base64,aaa' }

            await changeScene(hook, [el('a', 1)], { huge, small })
            expect(
                sentMessages()
                    .filter((m) => m.type === 'files')
                    .map((m) => Object.keys(m.files)),
            ).toEqual([['small']])
            clearSent()

            // The huge file is not tried again on the next change.
            await changeScene(hook, [el('a', 2)], { huge, small })
            expect(sentMessages().map((m) => m.type)).toEqual(['elements'])
        })

        it('does not send a file above the size limit even when the sync reply asks for it', async () => {
            const hook = await syncedHook()
            const huge = { id: 'huge', dataURL: 'x'.repeat(8 * 1024 * 1024 + 1) }
            await changeScene(hook, [], { huge })
            clearSent()

            send({ type: 'sync_reply', elements: [], wantFiles: ['huge'] })
            await waitForTick()

            expect(sentMessages()).toEqual([])
        })

        it('holds local changes until the sync reply arrives, including an element drawn after sync was sent', async () => {
            const hook = await renderReady()
            openSocket()
            clearSent()

            // The user draws after the sync message went out and before the reply.
            await changeScene(hook, [el('drawn', 1)])
            expect(sentMessages()).toEqual([])

            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            await waitForTick()

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('drawn', 1)] }])
        })

        it('sends the local elements that the sync reply lacks and not the ones it holds', async () => {
            const hook = await renderReady([el('offline', 2), el('held', 1)])
            act(() => hook.result.current.onWhiteboardChange())
            openSocket()
            clearSent()

            send({ type: 'sync_reply', elements: [el('held', 1)], wantFiles: [] })
            await waitForTick()

            expect(sentMessages()).toEqual([{ type: 'elements', elements: [el('offline', 2)] }])
        })

        it('sends again the files that the sync reply asks for', async () => {
            const hook = await syncedHook()
            const file = { id: 'file-a', dataURL: 'data:image/png;base64,aaa' }
            await changeScene(hook, [], { 'file-a': file })
            clearSent()

            send({ type: 'sync_reply', elements: [], wantFiles: ['file-a'] })
            await waitForTick()

            expect(sentMessages()).toEqual([{ type: 'files', files: { 'file-a': file } }])
        })

        it('does not send if WS is not open', async () => {
            const hook = await renderReady()

            await changeScene(hook, [el('a', 1)])

            expect(lastWs!.send).not.toHaveBeenCalled()
        })
    })

    describe('reconnect', () => {
        afterEach(() => {
            vi.useRealTimers()
        })

        // The socket opens after a dynamic import, so the API attaches under real timers first.
        const readyWithFakeTimers = async (scene: any[] = []) => {
            const hook = await renderReady(scene)
            vi.useFakeTimers()
            return hook
        }

        it('opens a new socket after an unexpected close and syncs again', async () => {
            await readyWithFakeTimers()
            openSocket()
            const first = lastWs

            closeSocket(1006)
            expect(constructorCallCount).toBe(1)

            act(() => {
                vi.advanceTimersByTime(1000)
            })
            expect(constructorCallCount).toBe(2)
            expect(lastWs).not.toBe(first)

            openSocket()
            expect(sentMessages()).toEqual([{ type: 'sync', fileIds: [] }])
        })

        it.each([
            [1008, 'rejected by the server'],
            [1000, 'closed because the appointment ended'],
        ])('does not reconnect after close code %i (%s)', async (code) => {
            await readyWithFakeTimers()
            openSocket()

            closeSocket(code)
            act(() => {
                vi.advanceTimersByTime(30_000)
            })

            expect(constructorCallCount).toBe(1)
        })

        it('reconnects after the server closes it for a rate limit (1013)', async () => {
            await readyWithFakeTimers()
            openSocket()

            closeSocket(1013)
            act(() => {
                vi.advanceTimersByTime(1000)
            })

            expect(constructorCallCount).toBe(2)
        })

        it('keeps growing the delay while the server accepts and then closes the socket', async () => {
            await readyWithFakeTimers()
            openSocket()
            closeSocket(1013)
            act(() => {
                vi.advanceTimersByTime(500)
            })
            expect(constructorCallCount).toBe(2)

            // The second socket opens and closes with no sync reply, so the delay is 500 to 1000 ms.
            openSocket()
            closeSocket(1013)
            act(() => {
                vi.advanceTimersByTime(400)
            })
            expect(constructorCallCount).toBe(2)
            act(() => {
                vi.advanceTimersByTime(600)
            })
            expect(constructorCallCount).toBe(3)
        })

        it('resets the delay after a sync reply', async () => {
            await readyWithFakeTimers()
            openSocket()
            closeSocket(1013)
            act(() => {
                vi.advanceTimersByTime(500)
            })
            expect(constructorCallCount).toBe(2)

            openSocket()
            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            closeSocket(1013)
            act(() => {
                vi.advanceTimersByTime(500)
            })

            expect(constructorCallCount).toBe(3)
        })

        it('ignores a late close and a late message from a socket that the hook disposed', async () => {
            const hook = renderHook(({ id }) => useWhiteboardSync(id), {
                initialProps: { id: 'apt-1' },
            })
            const api = makeExcalidrawAPIMock()
            await attachApi(hook.result, api)
            openSocket()
            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            const first = lastWs!

            // The appointment changes. A new socket opens and syncs.
            hook.rerender({ id: 'apt-2' })
            expect(lastWs).not.toBe(first)
            openSocket()
            send({ type: 'sync_reply', elements: [], wantFiles: [] })

            // The old socket reports its close and delivers a message late.
            act(() => {
                first.onclose?.(new CloseEvent('close', { code: 1006 }))
                first.onmessage?.(
                    new MessageEvent('message', {
                        data: JSON.stringify({ type: 'elements', elements: [el('old', 1)] }),
                    }),
                )
            })
            expect(hook.result.current.connected).toBe(true)
            expect(api.scene).toEqual([])

            // The new connection still sends local changes.
            clearSent()
            await changeScene({ result: hook.result, api }, [el('new', 1)])
            expect(sentElementIds()).toEqual(['new'])
        })

        it('does not reconnect after unmount', async () => {
            const { unmount } = await readyWithFakeTimers()
            openSocket()
            closeSocket(1006)

            unmount()
            act(() => {
                vi.advanceTimersByTime(30_000)
            })

            expect(constructorCallCount).toBe(1)
        })

        it('holds local changes while disconnected and sends them, with the rest, after the next sync reply', async () => {
            const hook = await renderReady([el('a', 1)])
            openSocket()
            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            await changeScene(hook, [el('a', 1)])
            expect(sentElementIds()).toEqual(['a'])

            // The socket drops. The user keeps drawing.
            closeSocket(1006)
            await changeScene(hook, [el('a', 1), el('offline', 1)])
            const firstWs = lastWs!
            expect(firstWs.send).toHaveBeenCalledTimes(2) // the first sync and the first elements

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1100))
            })
            expect(lastWs).not.toBe(firstWs)
            openSocket()
            expect(sentMessages()[0]).toEqual({ type: 'sync', fileIds: [] })
            await waitForTick()
            expect(sentElementIds()).toEqual([])
            send({ type: 'sync_reply', elements: [], wantFiles: [] })
            await waitForTick()

            // The client forgot what it sent. The server ignores the duplicate.
            expect(sentElementIds().sort()).toEqual(['a', 'offline'])
        })
    })

    describe('onPointerUpdate', () => {
        const sentCursors = () => sentMessages().filter((m) => m.type === 'cursor')

        it('sends only the latest pointer position on the interval', async () => {
            const { result } = await renderReady()
            openSocket()

            act(() => {
                for (const x of [1, 2, 3]) {
                    result.current.onPointerUpdate({ pointer: { x, y: x * 10 } })
                }
            })
            expect(sentCursors()).toEqual([])
            await waitForTick()

            expect(sentCursors()).toEqual([{ type: 'cursor', x: 3, y: 30 }])
        })

        it('does not send the same position twice', async () => {
            const { result } = await renderReady()
            openSocket()
            act(() => {
                result.current.onPointerUpdate({ pointer: { x: 5, y: 6 } })
            })
            await waitForTick()

            await waitForTick()

            expect(sentCursors()).toHaveLength(1)
        })

        it('sends nothing while the socket is not open', async () => {
            const { result } = await renderReady()

            act(() => {
                result.current.onPointerUpdate({ pointer: { x: 5, y: 6 } })
            })
            await waitForTick()

            expect(lastWs!.send).not.toHaveBeenCalled()
        })
    })

    it('calls ws.close on unmount', async () => {
        const { unmount } = await renderReady()

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
