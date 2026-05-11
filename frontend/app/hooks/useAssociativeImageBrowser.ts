import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { associativeImageService } from '~/services/associative-image.service'
import type { AssociativeImage } from '~/models/associative-image'

const PAGE_SIZE = 20

interface UseAssociativeImageBrowserOptions {
    enabled?: boolean
}

export interface UseAssociativeImageBrowserResult {
    images: AssociativeImage[]
    total: number
    searchQuery: string
    setSearchQuery: (value: string) => void
    debouncedSearch: string
    loading: boolean
    loadingMore: boolean
    handleLoadMore: () => Promise<void>
}

export function useAssociativeImageBrowser({
    enabled = true,
}: UseAssociativeImageBrowserOptions = {}): UseAssociativeImageBrowserResult {
    const [images, setImages] = useState<AssociativeImage[]>([])
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [loading, setLoading] = useState(enabled)
    const [loadingMore, setLoadingMore] = useState(false)

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
        if (!enabled) return
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
    }, [enabled, debouncedSearch, fetchImages])

    const handleLoadMore = async () => {
        setLoadingMore(true)
        try {
            const data = await fetchImages(debouncedSearch, images.length)
            setImages((prev) => [...prev, ...data.images])
            setTotal(data.total)
        } catch {
            toast.error('Failed to load more images.')
        } finally {
            setLoadingMore(false)
        }
    }

    return {
        images,
        total,
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        loading,
        loadingMore,
        handleLoadMore,
    }
}
