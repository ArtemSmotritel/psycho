import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { formatAppDate, formatAttachmentTitle } from '~/utils/utils'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'

interface AttachmentListItemProps {
    attachment: Attachment | AttachmentWithReaction
    detailHref: string
    title?: string
    extra?: ReactNode
    trailingActions?: ReactNode
}

export function AttachmentListItem({
    attachment,
    detailHref,
    title,
    extra,
    trailingActions,
}: AttachmentListItemProps) {
    const resolvedTitle = title ?? formatAttachmentTitle(attachment)
    const imageCount = attachment.imageFiles.length
    const audioCount = attachment.audioFiles.length
    const fileCountParts: string[] = []
    if (imageCount > 0) fileCountParts.push(`${imageCount} image(s)`)
    if (audioCount > 0) fileCountParts.push(`${audioCount} recording(s)`)

    return (
        <div className="border rounded-md p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{resolvedTitle}</p>
                <div className="flex items-center gap-1 shrink-0">
                    <Link to={detailHref}>
                        <Button variant="ghost" size="sm">
                            Open
                        </Button>
                    </Link>
                    {trailingActions}
                </div>
            </div>
            {attachment.text && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {attachment.text}
                </p>
            )}
            {fileCountParts.length > 0 && (
                <p className="text-xs text-muted-foreground">{fileCountParts.join(' · ')}</p>
            )}
            {extra}
            <p className="text-xs text-muted-foreground">{formatAppDate(attachment.createdAt)}</p>
        </div>
    )
}
