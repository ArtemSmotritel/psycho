// Largest inbound WebSocket frame. Bun closes the socket when a frame is larger.
export const MAX_MESSAGE_BYTES = 32 * 1024 * 1024

// The client repeats MAX_ELEMENTS_PER_MESSAGE and MAX_FILE_BYTES in
// `frontend/app/hooks/useWhiteboardSync.ts`. The two apps share no package, so change both places together.
// A frame fails only if 500 elements together exceed the frame limit, which is an average of 64 KB for each element.
export const MAX_ELEMENTS_PER_MESSAGE = 500
export const MAX_ROOM_ELEMENTS = 20_000
export const MAX_ELEMENT_ID_LENGTH = 128

export const MAX_ROOM_FILES = 100
export const MAX_FILE_BYTES = 8 * 1024 * 1024
// All files of one room. A sync can send all of them to a client, so this stays below the backpressure limit.
export const MAX_ROOM_FILE_BYTES = 64 * 1024 * 1024

// A connection that sends more messages than this in one window gets closed. It reconnects and syncs.
export const RATE_WINDOW_MS = 1_000
export const MAX_MESSAGES_PER_WINDOW = 300

// Save scheduling. The first change starts the timer. A failed save retries after the retry delay.
export const SAVE_DELAY_MS = 5_000
export const SAVE_RETRY_MS = 30_000

// Bun closes a socket whose send queue grows past this size. The client then reconnects and syncs.
export const BACKPRESSURE_LIMIT_BYTES = 128 * 1024 * 1024
