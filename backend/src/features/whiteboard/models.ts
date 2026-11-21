export interface WhiteboardElement {
    id: string
    version: number
    versionNonce: number
    index?: string | null
    [key: string]: unknown
}

export interface WhiteboardFile {
    id: string
    dataURL: string
    [key: string]: unknown
}

export type WhiteboardFiles = Record<string, WhiteboardFile>

/** Version pair that identifies one revision of an element: [version, versionNonce]. */
export type ElementVersion = readonly [number, number]

export interface WhiteboardState {
    elements: WhiteboardElement[]
    files: WhiteboardFiles
}

export type IncomingWhiteboardMessage =
    | { type: 'sync'; fileIds: string[] }
    | { type: 'elements'; elements: unknown[] }
    | { type: 'files'; files: Record<string, unknown> }
    | { type: 'cursor'; x: number; y: number }

export type OutgoingWhiteboardMessage =
    | { type: 'sync_reply'; elements: WhiteboardElement[]; wantFiles: string[] }
    | { type: 'elements'; elements: WhiteboardElement[] }
    | { type: 'files'; files: WhiteboardFiles }
    | {
          type: 'cursor'
          x: number
          y: number
          userName: string
          connectionId: string
      }
    | { type: 'leave'; connectionId: string }
