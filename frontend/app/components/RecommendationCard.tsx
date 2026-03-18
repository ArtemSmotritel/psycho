import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import type { AttachmentWithReaction } from '~/models/attachment'

interface RecommendationCardProps {
    recommendation: AttachmentWithReaction
    role: 'client' | 'psychologist'
    onToggleDone?: (id: string, done: boolean) => Promise<void>
    onSubmitComment?: (id: string, comment: string) => Promise<void>
    onSubmitReply?: (id: string, reply: string) => Promise<void>
}

export function RecommendationCard({
    recommendation,
    role,
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
                <p className="font-bold">{recommendation.name}</p>
                {recommendation.text && (
                    <p className="text-sm text-muted-foreground">{recommendation.text}</p>
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
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitComment}
                                        disabled={isSubmitting || !commentText.trim()}
                                    >
                                        Submit
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                )}

                {role === 'psychologist' && (
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
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitReply}
                                        disabled={isSubmitting || !replyText.trim()}
                                    >
                                        Submit
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
