export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const BODY_LIMIT_HEADROOM = 1024

function startsWith(buf: Uint8Array, prefix: number[], offset = 0): boolean {
    if (buf.length < offset + prefix.length) return false
    for (let i = 0; i < prefix.length; i++) {
        if (buf[offset + i] !== prefix[i]) return false
    }
    return true
}

// Returns the canonical MIME for the buffer's content, or null if unrecognized.
// Recognized types are the allowlist — the service should accept exactly these.
export function sniffMime(buf: Uint8Array): string | null {
    if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg'
    if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
    if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
    if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
        return 'image/webp'
    }

    if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm'
    if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) return 'audio/mp4'
    if (startsWith(buf, [0x4f, 0x67, 0x67, 0x53])) return 'audio/ogg'

    if (startsWith(buf, [0x49, 0x44, 0x33])) return 'audio/mpeg'
    // MP3 frame sync: 0xFF followed by a byte whose top 3 bits are set.
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg'

    return null
}

export function extensionForMime(mime: string): string {
    switch (mime) {
        case 'image/jpeg':
            return '.jpg'
        case 'image/png':
            return '.png'
        case 'image/webp':
            return '.webp'
        case 'image/gif':
            return '.gif'
        case 'audio/webm':
            return '.webm'
        case 'audio/mp4':
            return '.m4a'
        case 'audio/mpeg':
            return '.mp3'
        case 'audio/ogg':
            return '.ogg'
        default:
            return ''
    }
}
