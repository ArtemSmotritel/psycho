import { describe, expect, it } from 'bun:test'
import { sniffMime } from './upload-validation'

function bytes(...vals: number[]): Uint8Array {
    return new Uint8Array(vals)
}

describe('sniffMime', () => {
    it('detects image/jpeg', () => {
        expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe('image/jpeg')
    })

    it('detects image/png', () => {
        expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    })

    it('detects image/gif', () => {
        expect(sniffMime(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif')
    })

    it('detects image/webp (RIFF + WEBP)', () => {
        const buf = new Uint8Array(16)
        buf.set([0x52, 0x49, 0x46, 0x46], 0)
        buf.set([0x00, 0x00, 0x00, 0x00], 4)
        buf.set([0x57, 0x45, 0x42, 0x50], 8)
        expect(sniffMime(buf)).toBe('image/webp')
    })

    it('rejects RIFF without WEBP at offset 8', () => {
        const buf = new Uint8Array(16)
        buf.set([0x52, 0x49, 0x46, 0x46], 0)
        buf.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE" — RIFF audio, not an image
        expect(sniffMime(buf)).toBe(null)
    })

    it('detects audio/webm via EBML header', () => {
        expect(sniffMime(bytes(0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00))).toBe('audio/webm')
    })

    it('detects audio/mp4 via ftyp box at offset 4', () => {
        expect(
            sniffMime(
                bytes(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20),
            ),
        ).toBe('audio/mp4')
    })

    it('detects audio/ogg', () => {
        expect(sniffMime(bytes(0x4f, 0x67, 0x67, 0x53, 0x00, 0x02))).toBe('audio/ogg')
    })

    it('detects audio/mpeg via ID3 tag', () => {
        expect(sniffMime(bytes(0x49, 0x44, 0x33, 0x04, 0x00))).toBe('audio/mpeg')
    })

    it('detects audio/mpeg via MP3 frame sync', () => {
        expect(sniffMime(bytes(0xff, 0xfb, 0x90, 0x00))).toBe('audio/mpeg')
    })

    it('returns null for unrecognized bytes', () => {
        expect(sniffMime(bytes(0x00, 0x00, 0x00, 0x00))).toBe(null)
        expect(sniffMime(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe(null) // PDF header
    })

    it('returns null for empty / too-short buffers when no signature matches', () => {
        expect(sniffMime(new Uint8Array(0))).toBe(null)
        expect(sniffMime(bytes(0x52, 0x49, 0x46))).toBe(null) // partial RIFF, not enough bytes
    })
})
