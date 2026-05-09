import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyMessage } from './common/EmptyMessage'
import { associativeImageService } from '~/services/associative-image.service'
import type { AssociativeImage } from '~/models/associative-image'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

const PAGE_SIZE = 20

interface WhiteboardImageInsertProps {
    excalidrawAPI: ExcalidrawImperativeAPI | null
}

async function insertImageOntoCanvas(
    image: AssociativeImage,
    api: ExcalidrawImperativeAPI,
): Promise<void> {
    const response = await fetch(image.imageUrl, { credentials: 'include' })
    const blob = await response.blob()

    const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.src = dataURL
    })

    const MAX_DIM = 400
    const scale = Math.min(MAX_DIM / dimensions.width, MAX_DIM / dimensions.height, 1)
    const width = dimensions.width * scale
    const height = dimensions.height * scale

    const fileId = `assoc-${image.id}-${Date.now()}`

    api.addFiles([
        {
            id: fileId as any,
            dataURL: dataURL as any,
            mimeType: blob.type as any,
            created: Date.now(),
        },
    ])

    const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
    const newElements = convertToExcalidrawElements([
        {
            type: 'image' as const,
            x: 100,
            y: 100,
            width,
            height,
            fileId: fileId as any,
        },
    ])

    api.updateScene({
        elements: [...api.getSceneElements(), ...newElements],
    })
}

export function WhiteboardImageInsert({ excalidrawAPI }: WhiteboardImageInsertProps) {
    const [images, setImages] = useState<AssociativeImage[]>([])
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [insertingId, setInsertingId] = useState<string | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchImages = useCallback(async (search: string, offset: number) => {
        const res = await associativeImageService.getListForPsycho({
            search,
            limit: PAGE_SIZE,
            offset,
        })
        return res.data
    }, [])

    useEffect(() => {
        setLoading(true)
        fetchImages(debouncedSearch, 0)
            .then((data) => {
                setImages(data.images)
                setTotal(data.total)
            })
            .catch(() => {
                toast.error('Failed to load images.')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [debouncedSearch, fetchImages])

    const handleLoadMore = async () => {
        setLoadingMore(true)
        try {
            const data = await fetchImages(debouncedSearch, images.length)
            setImages([...images, ...data.images])
            setTotal(data.total)
        } catch {
            toast.error('Failed to load more images.')
        } finally {
            setLoadingMore(false)
        }
    }

    const handleInsert = async (image: AssociativeImage) => {
        if (!excalidrawAPI) {
            toast.error('Whiteboard is not ready yet.')
            return
        }
        setInsertingId(image.id)
        try {
            await insertImageOntoCanvas(image, excalidrawAPI)
            toast.success(`Inserted "${image.name}" onto the whiteboard.`)
        } catch {
            toast.error('Failed to insert image.')
        } finally {
            setInsertingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search images..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                />
            </div>

            {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

            {!loading && images.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {images.map((image) => (
                        <div key={image.id} className="border rounded-md p-2 space-y-2">
                            <div className="aspect-square overflow-hidden rounded-md">
                                <img
                                    src={image.imageUrl}
                                    alt={image.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <p className="text-xs font-medium truncate">{image.name}</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                disabled={!excalidrawAPI || insertingId === image.id}
                                onClick={() => handleInsert(image)}
                            >
                                {insertingId === image.id ? 'Inserting...' : 'Insert'}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && images.length < total && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}

            {!loading && images.length === 0 && !debouncedSearch && (
                <EmptyMessage
                    title="No images"
                    description="Add images from the Associative Images page first."
                />
            )}
            {!loading && images.length === 0 && debouncedSearch && (
                <EmptyMessage
                    title="No matches"
                    description="No images found matching your search"
                />
            )}
        </div>
    )
}
