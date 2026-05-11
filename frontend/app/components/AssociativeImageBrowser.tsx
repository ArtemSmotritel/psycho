import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { EmptyMessage } from './common/EmptyMessage'
import type { UseAssociativeImageBrowserResult } from '~/hooks/useAssociativeImageBrowser'
import type { AssociativeImage } from '~/models/associative-image'
import { Loading } from './common/Loading'

interface AssociativeImageBrowserProps {
    browser: UseAssociativeImageBrowserResult
    gridClassName?: string
    emptyDescription?: string
    renderItem: (image: AssociativeImage) => ReactNode
}

export function AssociativeImageBrowser({
    browser,
    gridClassName = 'grid grid-cols-2 sm:grid-cols-3 gap-3',
    emptyDescription = 'Your library is empty. Add images from the Associative Images page.',
    renderItem,
}: AssociativeImageBrowserProps) {
    const {
        images,
        total,
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        loading,
        loadingMore,
        handleLoadMore,
    } = browser

    return (
        <>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search images..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                />
            </div>

            {loading && <Loading text={'Loading...'} />}

            {!loading && images.length > 0 && (
                <div className={gridClassName}>{images.map((image) => renderItem(image))}</div>
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
                <EmptyMessage title="No images" description={emptyDescription} />
            )}
            {!loading && images.length === 0 && debouncedSearch && (
                <EmptyMessage
                    title="No matches"
                    description="No images found matching your search"
                />
            )}
        </>
    )
}
