import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { Card, CardContent } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { ConfirmAction } from '~/components/ConfirmAction'
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

const FINALITY_DESCRIPTION = "This is final — you won't be able to edit it later."

export function RecommendationCard({
    recommendation,
    role,
    detailHref,
    actions,
    onToggleDone,
    onSubmitComment,
    onSubmitReply,
}: RecommendationCardProps) {
    const { reaction } = recommendation
    const [commentText, setCommentText] = useState('')
    const [replyText, setReplyText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleToggleDone = async (checked: boolean) => {
        if (!onToggleDone) return
        setIsSubmitting(true)
        try {
            await onToggleDone(recommendation.id, checked)
        } catch {
            toast.error('Failed to update recommendation. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitComment = async () => {
        if (!onSubmitComment || !commentText.trim()) return
        setIsSubmitting(true)
        try {
            await onSubmitComment(recommendation.id, commentText.trim())
            setCommentText('')
        } catch {
            toast.error('Failed to submit comment. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitReply = async () => {
        if (!onSubmitReply || !replyText.trim()) return
        setIsSubmitting(true)
        try {
            await onSubmitReply(recommendation.id, replyText.trim())
            setReplyText('')
        } catch {
            toast.error('Failed to submit reply. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

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

                {role === 'client' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={`done-${recommendation.id}`}
                                checked={reaction?.done ?? false}
                                onCheckedChange={(checked) => handleToggleDone(checked === true)}
                                disabled={isSubmitting}
                            />
                            <label htmlFor={`done-${recommendation.id}`} className="text-sm">
                                Done
                            </label>
                        </div>

                        {reaction?.clientComment !== null &&
                        reaction?.clientComment !== undefined ? (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Your comment:
                                </p>
                                <p className="text-sm">{reaction.clientComment}</p>
                            </div>
                        ) : (
                            onSubmitComment && (
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Leave a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <ConfirmAction
                                        trigger={
                                            <Button
                                                size="sm"
                                                disabled={isSubmitting || !commentText.trim()}
                                            >
                                                Submit
                                            </Button>
                                        }
                                        title="Send comment?"
                                        description={FINALITY_DESCRIPTION}
                                        confirmText="Send"
                                        onConfirm={handleSubmitComment}
                                    />
                                </div>
                            )
                        )}

                        {reaction?.psychologistReply && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Psychologist&apos;s reply:
                                </p>
                                <p className="text-sm">{reaction.psychologistReply}</p>
                            </div>
                        )}
                    </div>
                )}

                {role === 'psycho' && (
                    <div className="space-y-2">
                        {reaction?.done !== undefined && (
                            <p className="text-sm text-muted-foreground">
                                Status: {reaction.done ? 'Done' : 'Not done'}
                            </p>
                        )}

                        {reaction?.clientComment && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Client comment:
                                </p>
                                <p className="text-sm">{reaction.clientComment}</p>
                            </div>
                        )}

                        {reaction?.psychologistReply !== null &&
                        reaction?.psychologistReply !== undefined ? (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Your reply:
                                </p>
                                <p className="text-sm">{reaction.psychologistReply}</p>
                            </div>
                        ) : (
                            onSubmitReply && (
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Write a reply..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <ConfirmAction
                                        trigger={
                                            <Button
                                                size="sm"
                                                disabled={isSubmitting || !replyText.trim()}
                                            >
                                                Submit
                                            </Button>
                                        }
                                        title="Send reply?"
                                        description={FINALITY_DESCRIPTION}
                                        confirmText="Send"
                                        onConfirm={handleSubmitReply}
                                    />
                                </div>
                            )
                        )}
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    {formatAppDate(recommendation.createdAt)}
                </p>
            </CardContent>
        </Card>
    )
}
