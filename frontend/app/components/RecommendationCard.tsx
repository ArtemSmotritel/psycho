import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { RecommendationReactionBlock } from '~/components/RecommendationReactionBlock'
import { formatAppDate } from '~/utils/utils'
import type { AttachmentWithReaction } from '~/models/attachment'

interface RecommendationCardProps {
    recommendation: AttachmentWithReaction
    role: 'client' | 'psycho'
    detailHref?: string
    actions?: ReactNode
    onToggleDone?: (id: string, done: boolean) => Promise<void>
    onSubmitComment?: (id: string, comment: string) => Promise<void>
    onSubmitReply?: (id: string, reply: string) => Promise<void>
}

export function RecommendationCard({
    recommendation,
    role,
    detailHref,
    actions,
    onToggleDone,
    onSubmitComment,
    onSubmitReply,
}: RecommendationCardProps) {
    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{recommendation.name}</p>
                    {(detailHref || actions) && (
                        <div className="flex items-center gap-1 shrink-0">
                            {detailHref && (
                                <Link to={detailHref}>
                                    <Button variant="ghost" size="sm">
                                        Open
                                    </Button>
                                </Link>
                            )}
                            {actions}
                        </div>
                    )}
                </div>
                {recommendation.text && (
                    <p className="text-sm text-muted-foreground">{recommendation.text}</p>
                )}

                {recommendation.imageFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {recommendation.imageFiles.map((file) => (
                            <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-20 h-20"
                            >
                                <img
                                    src={file.url}
                                    alt={file.originalName}
                                    className="w-full h-full object-cover rounded border"
                                />
                            </a>
                        ))}
                    </div>
                )}
                {recommendation.audioFiles.length > 0 && (
                    <div className="space-y-1">
                        {recommendation.audioFiles.map((file) => (
                            <audio key={file.id} controls className="w-full">
                                <source src={file.url} type={file.mimeType} />
                            </audio>
                        ))}
                    </div>
                )}

                <RecommendationReactionBlock
                    reaction={recommendation.reaction}
                    attachmentId={recommendation.id}
                    role={role}
                    onToggleDone={onToggleDone}
                    onSubmitComment={onSubmitComment}
                    onSubmitReply={onSubmitReply}
                />

                <p className="text-xs text-muted-foreground">
                    {formatAppDate(recommendation.createdAt)}
                </p>
            </CardContent>
        </Card>
    )
}
