export interface WhiteboardElement {
    id: string
    version: number
    [key: string]: unknown
}

export type WhiteboardFiles = Record<string, unknown>

export interface WhiteboardState {
    elements: WhiteboardElement[]
    files: WhiteboardFiles
}

export type IncomingWhiteboardMessage =
    | { type: 'elements'; elements: WhiteboardElement[] }
    | { type: 'files'; files: WhiteboardFiles }
    | { type: 'cursor'; x: number; y: number }

export type OutgoingWhiteboardMessage =
    | { type: 'scene_init'; elements: WhiteboardElement[]; files: WhiteboardFiles }
    | { type: 'elements'; elements: WhiteboardElement[] }
    | { type: 'files'; files: WhiteboardFiles }
    | { type: 'cursor'; x: number; y: number; userId: string; userName: string }
