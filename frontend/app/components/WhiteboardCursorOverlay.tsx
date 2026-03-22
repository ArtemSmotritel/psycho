import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const CURSOR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']

function getColorForUserId(userId: string): string {
    const index = userId.charCodeAt(0) % CURSOR_COLORS.length
    return CURSOR_COLORS[index]!
}

interface WhiteboardCursorOverlayProps {
    remoteCursors: Map<string, { x: number; y: number; name: string }>
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
                zIndex: 10,
            }}
        >
            {Array.from(remoteCursors.entries()).map(
                ([userId, { x: sceneX, y: sceneY, name }]) => {
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
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Arrow cursor SVG */}
                            <svg
                                width="16"
                                height="22"
                                viewBox="0 0 16 22"
                                fill="none"
                                style={{ display: 'block' }}
                            >
                                <path
                                    d="M0.5 0.5L15 11.5L8.5 12.5L12.5 21L9.5 22L5.5 13.5L0.5 17.5V0.5Z"
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="1"
                                />
                            </svg>
                            {/* Name label */}
                            <span
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '14px',
                                    background: color,
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    lineHeight: 1,
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }}
                            >
                                {name}
                            </span>
                        </div>
                    )
                },
            )}
        </div>
    )
}
