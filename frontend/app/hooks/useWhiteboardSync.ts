import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { useOptionalSidebar } from '~/components/ui/sidebar'
import { logIfNotProd } from '~/utils/logger'

// Matches the `duration-200` width transition of the sidebar gap in components/ui/sidebar.tsx.
const SIDEBAR_TRANSITION_MS = 200

// Local changes go out at most this often. A freedraw stroke changes an element at every point.
const ELEMENTS_INTERVAL_MS = 50
const CURSOR_INTERVAL_MS = 50
const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 10_000
// Close codes after which the server will not accept the connection again.
const NO_RECONNECT_CODES = new Set([1000, 1008])
// The two limits below must match `backend/src/features/whiteboard/limits.ts`. The two apps
// share no package, so change both places together.
//
// The server treats a message with more elements than this as invalid. Server name: MAX_ELEMENTS_PER_MESSAGE.
const MAX_ELEMENTS_PER_MESSAGE = 500
// The server rejects one file whose data URL is longer than this. A file above about 24 MiB
// would also close the socket on every send, so the client keeps it local.
// Server name: MAX_FILE_BYTES.
const MAX_FILE_CHARS = 8 * 1024 * 1024

type ExcalidrawLib = typeof import('@excalidraw/excalidraw')
type Version = readonly [number, number]
type RemoteCursor = { x: number; y: number; name: string }

type ServerMessage =
    | { type: 'elements'; elements: ExcalidrawElement[] }
    | { type: 'files'; files: Record<string, unknown> }
    | { type: 'sync_reply'; elements: ExcalidrawElement[]; wantFiles: string[] }
    | { type: 'cursor'; x: number; y: number; userName: string; connectionId: string }
    | { type: 'leave'; connectionId: string }

/**
 * True if `element` is a newer revision than `known`. This is the same rule as the server merge
 * and Excalidraw's `reconcileElements`: the higher version wins and, on a tie, the lower
 * versionNonce wins.
 */
function isNewerThan(known: Version, element: ExcalidrawElement): boolean {
    if (element.version !== known[0]) return element.version > known[0]
    return element.versionNonce < known[1]
}

function markKnown(known: Map<string, Version>, element: ExcalidrawElement): void {
    known.set(element.id, [element.version, element.versionNonce])
}

export function useWhiteboardSync(appointmentId: string): {
    setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
    onWhiteboardChange: () => void
    onPointerUpdate: (payload: { pointer: { x: number; y: number } }) => void
    remoteCursors: Map<string, RemoteCursor>
    connected: boolean
} {
    const wsRef = useRef<WebSocket | null>(null)
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const libRef = useRef<ExcalidrawLib | null>(null)
    // Set once the Excalidraw API and library are both ready to apply remote messages.
    // The socket connects only after this, so no message arrives before the scene can take it.
    const [readyApi, setReadyApi] = useState<ExcalidrawImperativeAPI | null>(null)
    // Last revision of each element that this client sent, or that it received and applied.
    // Local elements that are newer than this entry go out in the next flush.
    const knownRef = useRef<Map<string, Version>>(new Map())
    const sentFilesRef = useRef<Set<string>>(new Set())
    // True between a sync reply and the next socket close. Local changes wait until then,
    // so a reconnecting client never sends changes before the server has told it what it missed.
    const syncedRef = useRef(false)
    // Set by every Excalidraw change. The elements interval reads the scene and clears it.
    const dirtyRef = useRef(false)
    // The newest pointer position that the cursor interval has not sent yet.
    const latestCursorRef = useRef<{ x: number; y: number } | null>(null)
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map())
    const [connected, setConnected] = useState(false)

    /**
     * Runs on an interval. If the scene changed, it sends every new file and every local element
     * that is newer than the known revision. It waits while the socket is closed or not synced,
     * and keeps `dirty` set, so the first tick after the sync reply sends the changes.
     */
    const flush = useCallback(() => {
        const ws = wsRef.current
        const api = excalidrawAPIRef.current
        if (!dirtyRef.current || !api) return
        if (!ws || ws.readyState !== WebSocket.OPEN || !syncedRef.current) return
        dirtyRef.current = false

        // Files go first so an image element never reaches another user before its file.
        // Each file has its own message, so a message stays under the server frame limit.
        for (const [fileId, file] of Object.entries(api.getFiles())) {
            if (sentFilesRef.current.has(fileId)) continue
            // A file above the limit stays on this screen. It counts as sent, so the flush
            // does not check it again. A later `wantFiles` entry only makes one more check.
            if (file.dataURL.length > MAX_FILE_CHARS) {
                logIfNotProd('[Whiteboard] File too large to share', fileId)
            } else {
                ws.send(JSON.stringify({ type: 'files', files: { [fileId]: file } }))
            }
            sentFilesRef.current.add(fileId)
        }

        const changed = api.getSceneElementsIncludingDeleted().filter((element) => {
            const known = knownRef.current.get(element.id)
            return !known || isNewerThan(known, element)
        })
        for (let start = 0; start < changed.length; start += MAX_ELEMENTS_PER_MESSAGE) {
            const elements = changed.slice(start, start + MAX_ELEMENTS_PER_MESSAGE)
            ws.send(JSON.stringify({ type: 'elements', elements }))
        }
        for (const element of changed) markKnown(knownRef.current, element)
    }, [])

    /** Runs on an interval. Sends the newest pointer position, if it moved since the last send. */
    const sendCursor = useCallback(() => {
        const cursor = latestCursorRef.current
        const ws = wsRef.current
        if (!cursor || !ws || ws.readyState !== WebSocket.OPEN) return
        latestCursorRef.current = null
        ws.send(JSON.stringify({ type: 'cursor', x: cursor.x, y: cursor.y }))
    }, [])

    /** Merges remote elements into the local scene and records the revisions that won. */
    const applyRemoteElements = useCallback((remote: ExcalidrawElement[]) => {
        const api = excalidrawAPIRef.current
        const lib = libRef.current
        if (!api || !lib || remote.length === 0) return

        const restored = lib.restoreElements(remote, null)
        const reconciled = lib.reconcileElements(
            api.getSceneElementsIncludingDeleted() as never,
            restored as never,
            api.getAppState(),
        )
        api.updateScene({
            elements: reconciled,
            captureUpdate: lib.CaptureUpdateAction.NEVER,
        })

        // Record a remote revision only if it won. If the local element was kept (it is newer, or
        // the user is editing it now), the local revision stays "unsent" and goes out in the next flush.
        const reconciledById = new Map(reconciled.map((element) => [element.id, element]))
        for (const element of remote) {
            const winner = reconciledById.get(element.id)
            if (
                winner &&
                winner.version === element.version &&
                winner.versionNonce === element.versionNonce
            ) {
                markKnown(knownRef.current, element)
            }
        }
    }, [])

    const applyRemoteFiles = useCallback((files: Record<string, unknown>) => {
        excalidrawAPIRef.current?.addFiles(Object.values(files) as never)
        for (const fileId of Object.keys(files)) sentFilesRef.current.add(fileId)
    }, [])

    const handleServerMessage = useCallback(
        (message: ServerMessage) => {
            switch (message.type) {
                case 'elements':
                    applyRemoteElements(message.elements)
                    return

                case 'files':
                    applyRemoteFiles(message.files)
                    return

                case 'sync_reply': {
                    // The reply holds every server element. Winners become known. Every other local
                    // element is unknown, so the next flush sends it. The server ignores a duplicate.
                    applyRemoteElements(message.elements)
                    // The server lacks these files. Forget them so they go out again.
                    for (const fileId of message.wantFiles) sentFilesRef.current.delete(fileId)
                    syncedRef.current = true
                    dirtyRef.current = true
                    return
                }

                case 'cursor': {
                    const cursor = { x: message.x, y: message.y, name: message.userName }
                    setRemoteCursors((prev) => new Map(prev).set(message.connectionId, cursor))
                    return
                }

                case 'leave':
                    setRemoteCursors((prev) => {
                        if (!prev.has(message.connectionId)) return prev
                        const next = new Map(prev)
                        next.delete(message.connectionId)
                        return next
                    })
                    return
            }
        },
        [applyRemoteElements, applyRemoteFiles],
    )

    const setExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
        // React strict mode calls this twice with different API instances. The first is stale,
        // so always read the API through the ref.
        excalidrawAPIRef.current = api
        // Excalidraw is loaded lazily, so by now the module is already in the page.
        void import('@excalidraw/excalidraw').then((lib) => {
            libRef.current = lib
            // Wait one frame so Excalidraw's internal store is fully wired up.
            requestAnimationFrame(() => setReadyApi(excalidrawAPIRef.current))
        })
    }, [])

    useEffect(() => {
        if (!readyApi) return
        const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
        const wsUrl = baseUrl.replace(/^http/, 'ws') + `/api/whiteboard/${appointmentId}`
        let disposed = false
        let attempt = 0
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null

        sentFilesRef.current = new Set()
        syncedRef.current = false

        const connect = () => {
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                setConnected(true)
                // The server sends its whole scene in reply. Local elements that are not in it go out after the reply.
                knownRef.current = new Map()
                // Tell the server which files this client holds.
                ws.send(JSON.stringify({ type: 'sync', fileIds: Object.keys(readyApi.getFiles()) }))
            }

            ws.onclose = (event: CloseEvent) => {
                // A socket that the cleanup disposed must not touch the state of the new connection.
                if (disposed) return
                if (wsRef.current === ws) wsRef.current = null
                syncedRef.current = false
                setConnected(false)
                setRemoteCursors(new Map())
                if (NO_RECONNECT_CODES.has(event.code)) return
                const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt)
                attempt++
                reconnectTimer = setTimeout(connect, delay * (0.5 + Math.random() * 0.5))
            }

            ws.onmessage = (event: MessageEvent) => {
                if (disposed) return
                let message: ServerMessage
                try {
                    message = JSON.parse(event.data as string) as ServerMessage
                } catch {
                    return
                }
                // A connection counts as healthy only after the sync reply. A server that accepts
                // and then closes the socket keeps the delay growing.
                if (message.type === 'sync_reply') attempt = 0
                handleServerMessage(message)
            }
        }

        connect()
        const elementsTimer = setInterval(flush, ELEMENTS_INTERVAL_MS)
        const cursorTimer = setInterval(sendCursor, CURSOR_INTERVAL_MS)

        return () => {
            disposed = true
            if (reconnectTimer) clearTimeout(reconnectTimer)
            clearInterval(elementsTimer)
            clearInterval(cursorTimer)
            wsRef.current?.close()
            wsRef.current = null
        }
    }, [appointmentId, readyApi, handleServerMessage, flush, sendCursor])

    // Excalidraw calls this on every change, also for a selection or a scroll. The flush reads
    // the scene itself, so only the fact of a change matters.
    const onWhiteboardChange = useCallback(() => {
        dirtyRef.current = true
    }, [])

    const onPointerUpdate = useCallback((payload: { pointer: { x: number; y: number } }) => {
        latestCursorRef.current = { x: payload.pointer.x, y: payload.pointer.y }
    }, [])

    // Excalidraw refreshes its stored canvas offsets only when its container changes size.
    // A sidebar toggle can move the container without resizing it (centered, max-width page),
    // so the offsets go stale and pointer input lands in the wrong place.
    const sidebarState = useOptionalSidebar()?.state
    const previousSidebarStateRef = useRef(sidebarState)
    useEffect(() => {
        if (previousSidebarStateRef.current === sidebarState) return
        previousSidebarStateRef.current = sidebarState
        const timeout = setTimeout(() => {
            excalidrawAPIRef.current?.refresh()
        }, SIDEBAR_TRANSITION_MS + 50)
        return () => clearTimeout(timeout)
    }, [sidebarState])

    return { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors, connected }
}
