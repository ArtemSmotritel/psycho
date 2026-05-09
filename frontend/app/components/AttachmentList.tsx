import { Fragment, type ReactNode } from 'react'
import { EmptyMessage } from './EmptyMessage'
import { Loading } from './Loading'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'

interface AttachmentListProps<T extends Attachment | AttachmentWithReaction> {
    items: T[]
    isLoading?: boolean
    loadingText?: string
    emptyMessage: string
    renderItem: (item: T) => ReactNode
}

export function AttachmentList<T extends Attachment | AttachmentWithReaction>({
    items,
    isLoading,
    loadingText,
    emptyMessage,
    renderItem,
}: AttachmentListProps<T>) {
    if (isLoading) {
        return <Loading text={loadingText} />
    }
    if (items.length === 0) {
        return <EmptyMessage title={emptyMessage} />
    }
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <Fragment key={item.id}>{renderItem(item)}</Fragment>
            ))}
        </div>
    )
}
