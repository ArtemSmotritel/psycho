import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { associativeImageService } from '~/services/associative-image.service'
import type { AssociativeImage } from '~/models/associative-image'
import { EmptyMessage } from './EmptyMessage'

const PAGE_SIZE = 20

interface AssociativeImagePickerProps {
    trigger: React.ReactNode
    onSelect: (image: AssociativeImage) => void
}

export function AssociativeImagePicker({ trigger, onSelect }: AssociativeImagePickerProps) {
    const [open, setOpen] = useState(false)
    const [images, setImages] = useState<AssociativeImage[]>([])
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchImages = useCallback(async (search: string, offset: number) => {
        const res = await associativeImageService.getList({
            search,
            limit: PAGE_SIZE,
            offset,
        })
        return res.data
    }, [])

    useEffect(() => {
        if (!open) return
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
    }, [open, debouncedSearch, fetchImages])

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

    const handleSelect = (image: AssociativeImage) => {
        onSelect(image)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select from Library</DialogTitle>
                </DialogHeader>
                <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search images..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading && <p className="text-muted-foreground">Loading...</p>}

                    {!loading && images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {images.map((image) => (
                                <button
                                    key={image.id}
                                    type="button"
                                    className="group border rounded-md p-2 hover:border-primary hover:bg-accent transition-colors text-left"
                                    onClick={() => handleSelect(image)}
                                >
                                    <div className="aspect-square overflow-hidden rounded-md mb-1">
                                        <img
                                            src={image.imageUrl}
                                            alt={image.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-xs font-medium truncate">{image.name}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && images.length < total && (
                        <div className="flex justify-center mt-4">
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
                            description="Your library is empty. Add images from the Associative Images page."
                        />
                    )}
                    {!loading && images.length === 0 && debouncedSearch && (
                        <EmptyMessage
                            title="No matches"
                            description="No images found matching your search"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
