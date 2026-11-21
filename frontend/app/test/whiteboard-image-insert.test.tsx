import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { WhiteboardImageInsert } from '~/components/whiteboard/WhiteboardImageInsert'
import { ImageTooLargeError } from '~/utils/whiteboard-image'

const mockPrepare = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// jsdom cannot decode an image or draw on a canvas, so the helper that does both is replaced.
// Its size rules have their own tests in whiteboard-image.test.ts.
vi.mock('~/utils/whiteboard-image', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~/utils/whiteboard-image')>()
    return { ...actual, prepareImageForWhiteboard: (...args: unknown[]) => mockPrepare(...args) }
})

vi.mock('@excalidraw/excalidraw', () => ({ convertToExcalidrawElements: () => [] }))

const libraryImage = {
    id: 'img-1',
    name: 'Sea',
    imageUrl: '/api/files/sea.png',
    fileId: 'file-1',
    createdAt: '',
    updatedAt: '',
}

vi.mock('~/hooks/useAssociativeImageBrowser', () => ({
    useAssociativeImageBrowser: () => ({
        images: [libraryImage],
        total: 1,
        searchQuery: '',
        setSearchQuery: vi.fn(),
        debouncedSearch: '',
        loading: false,
        loadingMore: false,
        handleLoadMore: vi.fn(),
    }),
}))

const makeApi = () => ({
    addFiles: vi.fn(),
    updateScene: vi.fn(),
    getSceneElements: vi.fn(() => []),
})

describe('WhiteboardImageInsert', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ blob: async () => new Blob(['original']) }),
        )
        mockPrepare.mockResolvedValue({
            blob: new Blob(['prepared'], { type: 'image/png' }),
            width: 800,
            height: 400,
        })
    })

    const clickInsert = async (api: ReturnType<typeof makeApi>) => {
        render(<WhiteboardImageInsert excalidrawAPI={api as any} />)
        fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Insert' })).toBeEnabled())
    }

    it('adds the prepared image, not the original, under one id for the library image', async () => {
        const api = makeApi()
        await clickInsert(api)
        fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
        await waitFor(() => expect(api.addFiles).toHaveBeenCalledTimes(2))

        const [first, second] = api.addFiles.mock.calls.map((call) => call[0][0])
        expect(first.id).toBe('assoc-img-1')
        expect(second.id).toBe('assoc-img-1')
        expect(first.mimeType).toBe('image/png')
        expect(first.dataURL).toBe(`data:image/png;base64,${btoa('prepared')}`)
    })

    it('shows the size message and adds nothing when the image is too large', async () => {
        mockPrepare.mockRejectedValue(new ImageTooLargeError())
        const api = makeApi()

        await clickInsert(api)

        expect(toast.error).toHaveBeenCalledWith(new ImageTooLargeError().message)
        expect(api.addFiles).not.toHaveBeenCalled()
    })

    it('shows the general message for any other failure', async () => {
        mockPrepare.mockRejectedValue(new Error('The image could not be decoded.'))
        const api = makeApi()

        await clickInsert(api)

        expect(toast.error).toHaveBeenCalledWith('Failed to insert image.')
        expect(api.addFiles).not.toHaveBeenCalled()
    })
})
