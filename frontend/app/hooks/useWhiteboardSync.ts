import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export function useWhiteboardSync(appointmentId: string): {
    setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
    onWhiteboardChange: (
        elements: readonly ExcalidrawElement[],
        appState: AppState,
        files: BinaryFiles,
    ) => void
    onPointerUpdate: (payload: { pointer: { x: number; y: number }; button: string }) => void
    remoteCursors: Map<string, { x: number; y: number }>
    connected: boolean
} {
    const wsRef = useRef<WebSocket | null>(null)
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const sentFilesRef = useRef<Set<string>>(new Set())
    const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number }>>(
        new Map(),
    )
    const [connected, setConnected] = useState(false)

    const setExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
        excalidrawAPIRef.current = api
    }, [])

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

            const parsed = msg as {
                type: string
                elements?: unknown[]
                files?: Record<string, unknown>
                x?: number
                y?: number
                userId?: string
            }

            if (parsed.type === 'scene_init') {
                const elements = parsed.elements ?? []
                const files = parsed.files ?? {}
                excalidrawAPIRef.current?.updateScene({ elements: elements as ExcalidrawElement[] })
                excalidrawAPIRef.current?.addFiles(Object.values(files) as any[])
                // Mark received file IDs as already sent to avoid re-sending
                for (const fileId of Object.keys(files)) {
                    sentFilesRef.current.add(fileId)
                }
            } else if (parsed.type === 'elements') {
                excalidrawAPIRef.current?.updateScene({
                    elements: (parsed.elements ?? []) as ExcalidrawElement[],
                })
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
                setRemoteCursors((prev) => {
                    const next = new Map(prev)
                    next.set(userId, { x, y })
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

    const onPointerUpdate = useCallback(
        (payload: { pointer: { x: number; y: number }; button: string }) => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) return
            wsRef.current.send(
                JSON.stringify({ type: 'cursor', x: payload.pointer.x, y: payload.pointer.y }),
            )
        },
        [],
    )

    return { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors, connected }
}
