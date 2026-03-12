import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const CURSOR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']

function getColorForUserId(userId: string): string {
    const index = userId.charCodeAt(0) % CURSOR_COLORS.length
    return CURSOR_COLORS[index]!
}

interface WhiteboardCursorOverlayProps {
    remoteCursors: Map<string, { x: number; y: number }>
    excalidrawAPI: ExcalidrawImperativeAPI | null
}

export function WhiteboardCursorOverlay({
    remoteCursors,
    excalidrawAPI,
}: WhiteboardCursorOverlayProps) {
    const appState = excalidrawAPI?.getAppState()
    const scrollX = appState?.scrollX ?? 0
    const scrollY = appState?.scrollY ?? 0
    const zoomValue = appState?.zoom?.value ?? 1

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            {Array.from(remoteCursors.entries()).map(([userId, { x: sceneX, y: sceneY }]) => {
                const screenX = (sceneX + scrollX) * zoomValue
                const screenY = (sceneY + scrollY) * zoomValue
                const color = getColorForUserId(userId)

                return (
                    <div
                        key={userId}
                        style={{
                            position: 'absolute',
                            left: `${screenX}px`,
                            top: `${screenY}px`,
                            width: '10px',
                            height: '10px',
                            background: color,
                            borderRadius: '50%',
                            pointerEvents: 'none',
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )
            })}
        </div>
    )
}
