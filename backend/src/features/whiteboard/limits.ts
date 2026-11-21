// Largest inbound WebSocket frame. Bun closes the socket when a frame is larger.
export const MAX_MESSAGE_BYTES = 12 * 1024 * 1024

export const MAX_ELEMENTS_PER_MESSAGE = 5_000
export const MAX_ROOM_ELEMENTS = 20_000
export const MAX_ELEMENT_ID_LENGTH = 128

export const MAX_FILES_PER_MESSAGE = 10
export const MAX_ROOM_FILES = 100
export const MAX_FILE_BYTES = 8 * 1024 * 1024
// Server-to-client `files` messages are split so no frame grows without bound.
export const FILES_CHUNK_BYTES = 4 * 1024 * 1024

// A connection that sends more messages than this in one window gets the extra messages dropped.
export const RATE_WINDOW_MS = 1_000
export const MAX_MESSAGES_PER_WINDOW = 150
export const MAX_RATE_LIMITED_WINDOWS = 10
export const MIN_CURSOR_INTERVAL_MS = 30
export const MAX_INVALID_MESSAGES = 20

// Save scheduling.
export const SAVE_DEBOUNCE_MS = 3_000
export const SAVE_MAX_WAIT_MS = 12_000
export const SWEEP_INTERVAL_MS = 30_000

// Bun closes a socket whose send queue grows past this size. The client then reconnects and syncs.
export const BACKPRESSURE_LIMIT_BYTES = 32 * 1024 * 1024
