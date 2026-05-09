import { useState } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '~/components/ui/checkbox'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { ConfirmAction } from '~/components/common/ConfirmAction'
import type { RecommendationReaction } from '~/models/attachment'

const FINALITY_DESCRIPTION = "This is final — you won't be able to edit it later."

interface RecommendationReactionBlockProps {
    reaction: RecommendationReaction | null
    attachmentId: string
    role: 'client' | 'psycho'
    onToggleDone?: (id: string, done: boolean) => Promise<void>
    onSubmitComment?: (id: string, comment: string) => Promise<void>
    onSubmitReply?: (id: string, reply: string) => Promise<void>
}

export function RecommendationReactionBlock({
    reaction,
    attachmentId,
    role,
    onToggleDone,
    onSubmitComment,
    onSubmitReply,
}: RecommendationReactionBlockProps) {
    const [commentText, setCommentText] = useState('')
    const [replyText, setReplyText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleToggleDone = async (checked: boolean) => {
        if (!onToggleDone) return
        setIsSubmitting(true)
        try {
            await onToggleDone(attachmentId, checked)
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
            await onSubmitComment(attachmentId, commentText.trim())
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
            await onSubmitReply(attachmentId, replyText.trim())
            setReplyText('')
        } catch {
            toast.error('Failed to submit reply. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (role === 'client') {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id={`done-${attachmentId}`}
                        checked={reaction?.done ?? false}
                        onCheckedChange={(checked) => handleToggleDone(checked === true)}
                        disabled={isSubmitting || !onToggleDone}
                    />
                    <label htmlFor={`done-${attachmentId}`} className="text-sm">
                        Done
                    </label>
                </div>

                {reaction?.clientComment !== null && reaction?.clientComment !== undefined ? (
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Your comment:</p>
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
        )
    }

    return (
        <div className="space-y-2">
            {reaction?.done !== undefined && (
                <p className="text-sm text-muted-foreground">
                    Status: {reaction.done ? 'Done' : 'Not done'}
                </p>
            )}

            {reaction?.clientComment && (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Client comment:</p>
                    <p className="text-sm">{reaction.clientComment}</p>
                </div>
            )}

            {reaction?.psychologistReply !== null && reaction?.psychologistReply !== undefined ? (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Your reply:</p>
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
                                <Button size="sm" disabled={isSubmitting || !replyText.trim()}>
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
    )
}
