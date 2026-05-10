import type { ReactNode } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { AttachmentMediaPreview } from '~/components/attachments/AttachmentMediaPreview'
import { DeleteAttachmentButton } from '~/components/attachments/DeleteAttachmentButton'
import { EditAttachmentButton } from '~/components/attachments/EditAttachmentButton'
import { RecommendationReactionBlock } from '~/components/attachments/recommendations/RecommendationReactionBlock'
import { AttachmentIcon } from '~/utils/componentUtils'
import { formatAppDate, formatAttachmentTitle, getAttachmentTypeLabel } from '~/utils/utils'
import { recommendationService } from '~/services/recommendation.service'
import {
    getAttachmentDetailCapabilities,
    type AttachmentDetailRole,
} from '~/components/attachments/attachment-detail-capabilities'
import type { Attachment, RecommendationReaction } from '~/models/attachment'

interface AttachmentDetailProps {
    attachment: Attachment
    reaction?: RecommendationReaction | null
    role: AttachmentDetailRole
    appointmentId: string
    clientId?: string
    extraActions?: ReactNode
    onAfterMutation: () => void
    onAfterDelete: () => void
}

export function AttachmentDetail({
    attachment,
    reaction,
    role,
    appointmentId,
    clientId,
    extraActions,
    onAfterMutation,
    onAfterDelete,
}: AttachmentDetailProps) {
    const capabilities = getAttachmentDetailCapabilities(role, attachment)

    const handleToggleDone = async (id: string, done: boolean) => {
        await recommendationService.reactForClient(appointmentId, id, { done })
        onAfterMutation()
    }

    const handleSubmitComment = async (id: string, comment: string) => {
        await recommendationService.reactForClient(appointmentId, id, { comment })
        onAfterMutation()
    }

    const handleSubmitReply = async (id: string, reply: string) => {
        if (!clientId) return
        await recommendationService.replyForPsycho(clientId, appointmentId, id, { reply })
        onAfterMutation()
    }

    return (
        <>
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
                <EditAttachmentButton
                    clientId={clientId}
                    appointmentId={appointmentId}
                    attachment={attachment}
                    trigger={
                        <ActionItem icon={<Edit className="h-6" />} label="Edit Attachment" />
                    }
                    onSuccess={onAfterMutation}
                />

                {extraActions}

                <DeleteAttachmentButton
                    clientId={clientId}
                    appointmentId={appointmentId}
                    attachment={attachment}
                    trigger={
                        <ActionItem
                            icon={<Trash2 className="h-6" />}
                            label="Delete Attachment"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                        />
                    }
                    onSuccess={onAfterDelete}
                />
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

                {attachment.type === 'recommendation' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Recommendation</h3>
                        <RecommendationReactionBlock
                            reaction={reaction ?? null}
                            attachmentId={attachment.id}
                            role={role}
                            onToggleDone={capabilities.canReact ? handleToggleDone : undefined}
                            onSubmitComment={
                                capabilities.canReact ? handleSubmitComment : undefined
                            }
                            onSubmitReply={capabilities.canReply ? handleSubmitReply : undefined}
                        />
                    </div>
                )}
            </div>
        </>
    )
}
