import { useState } from 'react'
import { toast } from 'sonner'
import { AttachmentList } from '../AttachmentList'
import { AttachmentListItem } from '../AttachmentListItem'
import { AttachmentListHeader } from '../AttachmentListHeader'
import { LimitedAddButton } from '../LimitedAddButton'
import { DeleteAttachmentButton } from '../DeleteAttachmentButton'
import { EditAttachmentButton } from '../EditAttachmentButton'
import { RecommendationForm, type RecommendationFormCreateDTO } from './RecommendationForm'
import { RecommendationReactionBlock } from './RecommendationReactionBlock'
import { recommendationService } from '~/services/recommendation.service'
import { attachmentService, getCreateAttachmentErrorMessage } from '~/services/attachment.service'
import { routes } from '~/lib/routes'
import { ATTACHMENT_LIMITS } from '~/lib/attachment-limits'
import { useResource } from '~/hooks/useResource'
import type { AttachmentWithReaction, UpdateRecommendationDTO } from '~/models/attachment'

interface AppointmentRecommendationsPanelProps {
    clientId: string
    appointmentId: string
}

export function AppointmentRecommendationsPanel({
    clientId,
    appointmentId,
}: AppointmentRecommendationsPanelProps) {
    const {
        data,
        isLoading,
        error,
        refetch: fetchRecommendations,
    } = useResource<AttachmentWithReaction[]>(
        () =>
            attachmentService
                .listForPsycho(clientId, appointmentId, 'recommendation')
                .then((res) => res.data.recommendations),
        [clientId, appointmentId],
        { initial: [], errorMessage: 'Failed to load recommendations.' },
    )
    const recommendations = data ?? []
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async (dto: RecommendationFormCreateDTO | UpdateRecommendationDTO) => {
        setIsCreating(true)
        try {
            const create = dto as RecommendationFormCreateDTO
            await attachmentService.createForPsycho(clientId, appointmentId, {
                type: 'recommendation',
                name: create.name,
                text: create.text,
                imageFileIds: create.imageFileIds,
                audioFileIds: create.audioFileIds,
            })
            toast.success('Recommendation created.')
            await fetchRecommendations()
        } catch (err) {
            toast.error(getCreateAttachmentErrorMessage(err, 'Failed to create recommendation.'))
        } finally {
            setIsCreating(false)
        }
    }

    const handleReply = async (id: string, reply: string) => {
        try {
            await recommendationService.replyForPsycho(clientId, appointmentId, id, { reply })
            await fetchRecommendations()
        } catch {
            toast.error('Failed to submit reply.')
        }
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    const recommendationLimit = ATTACHMENT_LIMITS.recommendation

    return (
        <div className="space-y-4">
            <AttachmentListHeader
                title="Recommendations"
                count={recommendations.length}
                limit={recommendationLimit}
                action={
                    <RecommendationForm
                        mode="create"
                        trigger={
                            <LimitedAddButton
                                count={recommendations.length}
                                limit={recommendationLimit}
                                label="Add Recommendation"
                                tooltipNoun="recommendations"
                            />
                        }
                        isLoading={isCreating}
                        onSubmit={handleCreate}
                    />
                }
            />

            <AttachmentList
                items={recommendations}
                isLoading={isLoading}
                loadingText="Loading recommendations..."
                emptyMessage="No recommendations yet."
                renderItem={(recommendation) => (
                    <AttachmentListItem
                        attachment={recommendation}
                        detailHref={routes.psycho.attachment(
                            clientId,
                            appointmentId,
                            recommendation.id,
                        )}
                        extra={
                            <RecommendationReactionBlock
                                role="psycho"
                                reaction={recommendation.reaction}
                                attachmentId={recommendation.id}
                                onSubmitReply={handleReply}
                            />
                        }
                        trailingActions={
                            <>
                                <EditAttachmentButton
                                    clientId={clientId}
                                    appointmentId={appointmentId}
                                    attachment={recommendation}
                                    onSuccess={fetchRecommendations}
                                />
                                <DeleteAttachmentButton
                                    clientId={clientId}
                                    appointmentId={appointmentId}
                                    attachment={recommendation}
                                    onSuccess={fetchRecommendations}
                                />
                            </>
                        }
                    />
                )}
            />
        </div>
    )
}
