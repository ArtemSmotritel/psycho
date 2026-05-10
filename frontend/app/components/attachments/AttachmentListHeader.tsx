import type { ReactNode } from 'react'
import { AttachmentCountBadge } from './AttachmentCountBadge'

interface AttachmentListHeaderProps {
    title: string
    count?: number
    limit?: number
    action?: ReactNode
}

export function AttachmentListHeader({ title, count, limit, action }: AttachmentListHeaderProps) {
    const showBadge = count !== undefined && limit !== undefined
    return (
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
                {title}
                {showBadge && (
                    <>
                        {' '}
                        <AttachmentCountBadge count={count} limit={limit} />
                    </>
                )}
            </h3>
            {action}
        </div>
    )
}
