import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/** Lightweight signature of an element array: "id@version" entries sorted and joined. */
function elementSignature(els: readonly ExcalidrawElement[]): string {
    if (!Array.isArray(els)) return ''
    return els
        .map((e) => `${e.id}@${e.version}`)
        .sort()
        .join('|')
}

export function useWhiteboardSync(appointmentId: string): {
    setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
    onWhiteboardChange: (
        elements: readonly ExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles,
    ) => void
    onPointerUpdate: (payload: { pointer: { x: number; y: number }; button: string }) => void
    remoteCursors: Map<string, { x: number; y: number; name: string }>
    connected: boolean
} {
    const wsRef = useRef<WebSocket | null>(null)
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const sentFilesRef = useRef<Set<string>>(new Set())
    // Signature of the last element array received from the server.
    // Used to suppress the onChange echo that fires after a remote updateScene call.
    const lastRemoteSignatureRef = useRef<string>('')
    // Buffer scene_init if it arrives before Excalidraw API is ready
    const pendingSceneRef = useRef<{
        elements: ExcalidrawElement[]
        files: Record<string, unknown>
    } | null>(null)
    const [remoteCursors, setRemoteCursors] = useState<
        Map<string, { x: number; y: number; name: string }>
    >(new Map())
    const [connected, setConnected] = useState(false)

    const applyScene = useCallback(
        (
            api: ExcalidrawImperativeAPI,
            elements: ExcalidrawElement[],
            files: Record<string, unknown>,
        ) => {
            if (elements.length > 0) {
                lastRemoteSignatureRef.current = elementSignature(elements)
                api.updateScene({ elements })
            }
            if (Object.keys(files).length > 0) {
                api.addFiles(Object.values(files) as any[])
            }
            for (const fileId of Object.keys(files)) {
                sentFilesRef.current.add(fileId)
            }
        },
        [],
    )

    const setExcalidrawAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            excalidrawAPIRef.current = api
            // Apply buffered scene_init if it arrived before the API was ready.
            // Deferred to the next frame so Excalidraw's internal store is fully wired up.
            // Uses excalidrawAPIRef.current (not the captured `api`) to handle React strict
            // mode, which calls this callback twice with different API instances — the first
            // is stale and the second is the real one.
            if (pendingSceneRef.current) {
                requestAnimationFrame(() => {
                    if (excalidrawAPIRef.current && pendingSceneRef.current) {
                        applyScene(
                            excalidrawAPIRef.current,
                            pendingSceneRef.current.elements,
                            pendingSceneRef.current.files,
                        )
                        pendingSceneRef.current = null
                    }
                })
            }
        },
        [applyScene],
    )

    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
        const wsUrl = baseUrl.replace(/^http/, 'ws') + `/api/whiteboard/${appointmentId}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => setConnected(true)

        ws.onclose = () => {
            setConnected(false)
            setRemoteCursors(new Map())
        }

        ws.onerror = () => setConnected(false)

        ws.onmessage = (event: MessageEvent) => {
            let msg: unknown
            try {
                msg = JSON.parse(event.data as string)
            } catch {
                return
            }
            console.log(msg)

            const parsed = msg as {
                type: string
                elements?: unknown[]
                files?: Record<string, unknown>
                x?: number
                y?: number
                userId?: string
                userName?: string
            }

            if (parsed.type === 'scene_init') {
                const elements = (parsed.elements ?? []) as ExcalidrawElement[]
                const files = (parsed.files ?? {}) as Record<string, unknown>
                if (excalidrawAPIRef.current) {
                    applyScene(excalidrawAPIRef.current, elements, files)
                } else {
                    // Buffer until Excalidraw API is ready
                    pendingSceneRef.current = { elements, files }
                }
            } else if (parsed.type === 'elements') {
                const elements = (parsed.elements ?? []) as ExcalidrawElement[]
                lastRemoteSignatureRef.current = elementSignature(elements)
                excalidrawAPIRef.current?.updateScene({ elements })
            } else if (parsed.type === 'files') {
                const files = parsed.files ?? {}
                excalidrawAPIRef.current?.addFiles(Object.values(files) as any[])
                for (const fileId of Object.keys(files)) {
                    sentFilesRef.current.add(fileId)
                }
            } else if (parsed.type === 'cursor' && parsed.userId != null) {
                const userId = parsed.userId
                const x = parsed.x ?? 0
                const y = parsed.y ?? 0
                const name = parsed.userName ?? 'Anonymous'
                setRemoteCursors((prev) => {
                    const next = new Map(prev)
                    next.set(userId, { x, y, name })
                    return next
                })
            }
        }

        wsRef.current = ws

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [appointmentId])

    const onWhiteboardChange = useCallback(
        (elements: readonly ExcalidrawElement[], _appState: AppState, files: BinaryFiles) => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) return

            // Ignore empty element arrays — these are Excalidraw initialization artifacts.
            // Even when all drawings are deleted, Excalidraw keeps them with isDeleted: true,
            // so a real scene is never an empty array. Sending [] would wipe server state.
            if (elements.length === 0) return

            // Skip if this onChange was triggered by a remote updateScene call.
            // When the server pushes elements and we call updateScene(), Excalidraw fires
            // onChange with those same elements — sending them back would create an
            // infinite broadcast loop that overwrites local drawings.
            const sig = elementSignature(elements)
            if (sig === lastRemoteSignatureRef.current) return

            wsRef.current.send(JSON.stringify({ type: 'elements', elements }))

            const newFiles: Record<string, unknown> = {}
            for (const fileId of Object.keys(files)) {
                if (!sentFilesRef.current.has(fileId)) {
                    newFiles[fileId] = files[fileId]
                }
            }
            if (Object.keys(newFiles).length > 0) {
                wsRef.current.send(JSON.stringify({ type: 'files', files: newFiles }))
                for (const fileId of Object.keys(newFiles)) {
                    sentFilesRef.current.add(fileId)
                }
            }
        },
        [],
    )

    const lastCursorSendRef = useRef<number>(0)
    const onPointerUpdate = useCallback(
        (payload: { pointer: { x: number; y: number }; button: string }) => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) return
            const now = Date.now()
            if (now - lastCursorSendRef.current < 50) return
            lastCursorSendRef.current = now
            wsRef.current.send(
                JSON.stringify({ type: 'cursor', x: payload.pointer.x, y: payload.pointer.y }),
            )
        },
        [],
    )

    return { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors, connected }
}
