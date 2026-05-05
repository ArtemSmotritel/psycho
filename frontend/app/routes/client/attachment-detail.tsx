import { useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { AttachmentMediaPreview } from '~/components/AttachmentMediaPreview'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentClientAttachment } from '~/hooks/useCurrentClientAttachment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { AttachmentIcon } from '~/utils/componentUtils'
import { formatAppDate, formatAttachmentTitle, getAttachmentTypeLabel } from '~/utils/utils'
import { attachmentService, getDeleteAttachmentErrorMessage } from '~/services/attachment.service'
import { recommendationService } from '~/services/recommendation.service'
import { routes } from '~/lib/routes'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'

export default function ClientAttachmentDetail() {
    useRoleGuard(['client'])

    const { appointmentId } = useParams<{ appointmentId: string }>()
    const navigate = useNavigate()
    const { attachment, reaction, isLoading, refetch } = useCurrentClientAttachment()

    const [commentText, setCommentText] = useState('')
    const [isSubmittingComment, setIsSubmittingComment] = useState(false)

    if (isLoading) {
        return (
            <PageContainer>
                <p>Loading...</p>
            </PageContainer>
        )
    }

    if (!attachment) {
        return (
            <PageContainer>
                <p>Attachment not found.</p>
            </PageContainer>
        )
    }

    const isOwnImpression = attachment.type === 'impression'
    const isRecommendation = attachment.type === 'recommendation'

    const handleDelete = async () => {
        try {
            await attachmentService.deleteForClient(appointmentId!, attachment.id)
            toast.success('Attachment deleted.')
            navigate(routes.client.appointment(appointmentId!))
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
        }
    }

    const handleSubmitComment = async () => {
        if (!commentText.trim()) return
        setIsSubmittingComment(true)
        try {
            await recommendationService.reactForClient(appointmentId!, attachment.id, {
                comment: commentText.trim(),
            })
            setCommentText('')
            refetch()
        } catch {
            toast.error('Failed to submit comment. Please try again.')
        } finally {
            setIsSubmittingComment(false)
        }
    }

    return (
        <PageContainer>
            <AppPageHeader text="Attachment" linkTo={routes.client.appointment(appointmentId!)} />

            <div className="flex items-center gap-4">
                <AttachmentIcon type={attachment.type} size="h-8 w-8" />
                <div>
                    <h1 className="text-2xl font-bold">{formatAttachmentTitle(attachment)}</h1>
                    <p className="text-sm text-muted-foreground">
                        {getAttachmentTypeLabel(attachment.type)} &middot;{' '}
                        {formatAppDate(attachment.createdAt)}
                    </p>
                </div>
            </div>

            <ActionsSection title="Actions">
                <Link to={routes.client.appointment(appointmentId!)}>
                    <ActionItem icon={<ArrowRight className="h-6" />} label="Open Session" />
                </Link>

                {isOwnImpression && (
                    <ConfirmDeleteButton
                        itemLabel="Impression"
                        trigger={
                            <ActionItem
                                icon={<Trash2 className="h-6" />}
                                label="Delete Impression"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                            />
                        }
                        onConfirm={handleDelete}
                    />
                )}
            </ActionsSection>

            <div className="space-y-8">
                {attachment.text && (
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Description</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {attachment.text}
                        </p>
                    </div>
                )}

                <AttachmentMediaPreview
                    audioFiles={attachment.audioFiles}
                    imageFiles={attachment.imageFiles}
                />

                {isRecommendation && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Recommendation</h3>

                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Status</p>
                            <p className="text-sm">{reaction?.done ? 'Done' : 'Not done'}</p>
                        </div>

                        {reaction?.clientComment ? (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Your comment
                                </p>
                                <p className="text-sm whitespace-pre-wrap">
                                    {reaction.clientComment}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label
                                    className="text-xs font-medium text-muted-foreground"
                                    htmlFor="client-comment"
                                >
                                    Your comment
                                </label>
                                <Textarea
                                    id="client-comment"
                                    placeholder="Leave a comment..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    disabled={isSubmittingComment}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be sent and cannot be edited.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={handleSubmitComment}
                                    disabled={isSubmittingComment || !commentText.trim()}
                                >
                                    Submit
                                </Button>
                            </div>
                        )}

                        {reaction?.psychologistReply && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Psychologist&apos;s reply
                                </p>
                                <p className="text-sm whitespace-pre-wrap">
                                    {reaction.psychologistReply}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageContainer>
    )
}
