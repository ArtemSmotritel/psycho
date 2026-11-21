import { describe, expect, it } from 'bun:test'
import { decide, diffFiles, mergeElements, mergeFiles, parseElement } from './merge'
import { MAX_FILE_BYTES, MAX_ROOM_FILE_BYTES } from './limits'
import type { WhiteboardElement, WhiteboardFile } from './models'

const el = (id: string, version: number, versionNonce = 1, extra = {}): WhiteboardElement => ({
    id,
    version,
    versionNonce,
    ...extra,
})

const file = (id: string, size = 10): WhiteboardFile => ({ id, dataURL: 'x'.repeat(size) })

describe('decide', () => {
    it('accepts a higher version', () => {
        expect(decide([1, 5], [2, 9])).toBe('accept')
    })

    it('keeps the current element when it has a higher version', () => {
        expect(decide([3, 5], [2, 1])).toBe('keep')
    })

    it('breaks a version tie with the lower versionNonce', () => {
        expect(decide([2, 10], [2, 4])).toBe('accept')
        expect(decide([2, 4], [2, 10])).toBe('keep')
    })

    it('reports an identical revision as a duplicate', () => {
        expect(decide([2, 4], [2, 4])).toBe('duplicate')
    })
})

describe('parseElement', () => {
    it('accepts a valid element', () => {
        expect(parseElement(el('a', 1))).not.toBeNull()
    })

    it.each([
        ['null', null],
        ['array', []],
        ['no id', { version: 1, versionNonce: 1 }],
        ['empty id', el('', 1)],
        ['long id', el('x'.repeat(200), 1)],
        ['float version', el('a', 1.5)],
        ['negative version', el('a', -1)],
        ['string nonce', { id: 'a', version: 1, versionNonce: '1' }],
        ['numeric index', { id: 'a', version: 1, versionNonce: 1, index: 5 }],
    ])('rejects %s', (_name, value) => {
        expect(parseElement(value)).toBeNull()
    })
})

describe('mergeElements', () => {
    it('adds a new element and reports it as accepted', () => {
        const room = new Map<string, WhiteboardElement>()
        const result = mergeElements(room, [el('a', 1)])
        expect(result.accepted.map((e) => e.id)).toEqual(['a'])
        expect(room.has('a')).toBe(true)
    })

    it('keeps both elements when two users add different elements', () => {
        const room = new Map<string, WhiteboardElement>()
        mergeElements(room, [el('a', 1)])
        mergeElements(room, [el('b', 1)])
        expect([...room.keys()].sort()).toEqual(['a', 'b'])
    })

    it('returns the server copy when the incoming element is stale', () => {
        const room = new Map<string, WhiteboardElement>([['a', el('a', 5)]])
        const result = mergeElements(room, [el('a', 3)])
        expect(result.accepted).toEqual([])
        expect(result.stale.map((e) => e.version)).toEqual([5])
        expect(room.get('a')!.version).toBe(5)
    })

    it('ignores an identical revision', () => {
        const room = new Map<string, WhiteboardElement>([['a', el('a', 2, 7)]])
        const result = mergeElements(room, [el('a', 2, 7)])
        expect(result.accepted).toEqual([])
        expect(result.stale).toEqual([])
    })

    it('uses the last revision of an id that repeats in one batch', () => {
        const room = new Map<string, WhiteboardElement>()
        const result = mergeElements(room, [el('a', 1), el('a', 3), el('a', 2)])
        expect(room.get('a')!.version).toBe(3)
        expect(result.accepted.map((e) => e.version)).toEqual([3])
        expect(result.stale).toEqual([])
    })

    it('counts invalid elements and still merges the valid ones', () => {
        const room = new Map<string, WhiteboardElement>()
        const result = mergeElements(room, [el('a', 1), { id: 5 }, 'junk'])
        expect(result.rejected).toBe(2)
        expect(room.has('a')).toBe(true)
    })

    it('gives the same result for any message order', () => {
        const revisions = [el('a', 1, 9), el('a', 2, 5), el('a', 2, 3), el('b', 1), el('a', 4, 8)]
        const forward = new Map<string, WhiteboardElement>()
        const backward = new Map<string, WhiteboardElement>()
        for (const r of revisions) mergeElements(forward, [r])
        for (const r of [...revisions].reverse()) mergeElements(backward, [r])
        expect(forward.get('a')).toEqual(backward.get('a')!)
        expect(forward.get('b')).toEqual(backward.get('b')!)
        expect(forward.get('a')!.version).toBe(4)
    })
})

describe('mergeFiles', () => {
    it('adds new files and never replaces an existing id', () => {
        const room = new Map<string, WhiteboardFile>([['f1', file('f1', 5)]])
        const { added, rejected } = mergeFiles(room, { f1: file('f1', 99), f2: file('f2') })
        expect(Object.keys(added)).toEqual(['f2'])
        expect(rejected).toBe(0)
        expect(room.get('f1')!.dataURL.length).toBe(5)
    })

    it('rejects a file whose id does not match its key or that has no dataURL', () => {
        const room = new Map<string, WhiteboardFile>()
        const { added, rejected } = mergeFiles(room, {
            a: file('b'),
            c: { id: 'c' },
        })
        expect(added).toEqual({})
        expect(rejected).toBe(2)
    })
})

describe('diffFiles', () => {
    const files = new Map<string, WhiteboardFile>([
        ['f1', file('f1')],
        ['f2', file('f2')],
    ])

    it('sends every file to a client that holds none', () => {
        const diff = diffFiles(files, [])
        expect(Object.keys(diff.missing)).toEqual(['f1', 'f2'])
        expect(diff.wanted).toEqual([])
    })

    it('diffs files by id in both directions', () => {
        const diff = diffFiles(files, ['f2', 'f3'])
        expect(Object.keys(diff.missing)).toEqual(['f1'])
        expect(diff.wanted).toEqual(['f3'])
    })

    it('sends and wants nothing when both sides match', () => {
        const diff = diffFiles(files, ['f1', 'f2'])
        expect(diff.missing).toEqual({})
        expect(diff.wanted).toEqual([])
    })
})

describe('size limits', () => {
    it('rejects a file that would push the room above the room file limit', () => {
        const room = new Map<string, WhiteboardFile>()
        const fileCount = MAX_ROOM_FILE_BYTES / MAX_FILE_BYTES
        const incoming: Record<string, unknown> = {}
        for (let i = 0; i <= fileCount; i++) incoming[`f${i}`] = file(`f${i}`, MAX_FILE_BYTES)

        const { added, rejected } = mergeFiles(room, incoming)

        expect(Object.keys(added)).toHaveLength(fileCount)
        expect(rejected).toBe(1)
    })
})
