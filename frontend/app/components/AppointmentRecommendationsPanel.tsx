import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { EmptyMessage } from './EmptyMessage'
import { Loading } from './Loading'
import { RecommendationCard } from './RecommendationCard'
import { RecommendationForm, type RecommendationFormCreateDTO } from './RecommendationForm'
import { recommendationService } from '~/services/recommendation.service'
import { attachmentService, getDeleteAttachmentErrorMessage } from '~/services/attachment.service'
import { routes } from '~/lib/routes'
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
    const [updatingId, setUpdatingId] = useState<string | null>(null)

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
        } catch {
            toast.error('Failed to create recommendation.')
        } finally {
            setIsCreating(false)
        }
    }

    const handleUpdate = async (
        recommendationId: string,
        dto: RecommendationFormCreateDTO | UpdateRecommendationDTO,
    ) => {
        setUpdatingId(recommendationId)
        try {
            await attachmentService.updateForPsycho(
                clientId,
                appointmentId,
                recommendationId,
                dto as UpdateRecommendationDTO,
            )
            toast.success('Recommendation updated.')
            await fetchRecommendations()
        } catch {
            toast.error('Failed to update recommendation.')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleDelete = async (recommendationId: string) => {
        try {
            await attachmentService.deleteForPsycho(clientId, appointmentId, recommendationId)
            toast.success('Recommendation deleted.')
            await fetchRecommendations()
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
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

    if (isLoading) {
        return <Loading text="Loading recommendations..." />
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recommendations</h3>
                <RecommendationForm
                    mode="create"
                    trigger={<Button size="sm">Add Recommendation</Button>}
                    isLoading={isCreating}
                    onSubmit={handleCreate}
                />
            </div>

            {recommendations.length === 0 ? (
                <EmptyMessage title="No recommendations yet." />
            ) : (
                <div className="space-y-3">
                    {recommendations.map((recommendation) => (
                        <RecommendationCard
                            key={recommendation.id}
                            recommendation={recommendation}
                            role="psycho"
                            detailHref={routes.psycho.attachment(
                                clientId,
                                appointmentId,
                                recommendation.id,
                            )}
                            onSubmitReply={handleReply}
                            actions={
                                <>
                                    <RecommendationForm
                                        mode="edit"
                                        trigger={
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        }
                                        initialData={{
                                            name: recommendation.name,
                                            text: recommendation.text ?? '',
                                            voiceFiles: recommendation.audioFiles,
                                            imageFiles: recommendation.imageFiles,
                                        }}
                                        isLoading={updatingId === recommendation.id}
                                        onSubmit={(dto) => handleUpdate(recommendation.id, dto)}
                                    />
                                    <ConfirmDeleteButton
                                        itemLabel="Recommendation"
                                        onConfirm={() => handleDelete(recommendation.id)}
                                    />
                                </>
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
