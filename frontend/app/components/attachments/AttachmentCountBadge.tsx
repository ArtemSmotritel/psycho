interface AttachmentCountBadgeProps {
    count: number
    limit: number
}

export function AttachmentCountBadge({ count, limit }: AttachmentCountBadgeProps) {
    return (
        <span className="text-sm font-normal text-muted-foreground">
            {count}/{limit}
        </span>
    )
}
