import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { ConfirmAction } from './ConfirmAction'
import { RecommendationForm } from './RecommendationForm'
import { recommendationService } from '~/services/recommendation.service'
import type {
    AttachmentWithReaction,
    CreateRecommendationDTO,
    UpdateRecommendationDTO,
} from '~/models/attachment'

interface AppointmentRecommendationsPanelProps {
    clientId: string
    appointmentId: string
}

export function AppointmentRecommendationsPanel({
    clientId,
    appointmentId,
}: AppointmentRecommendationsPanelProps) {
    const [recommendations, setRecommendations] = useState<AttachmentWithReaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})

    const fetchRecommendations = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await recommendationService.getList(clientId, appointmentId)
            setRecommendations(res.data.recommendations)
        } catch {
            setError('Failed to load recommendations.')
        } finally {
            setIsLoading(false)
        }
    }, [clientId, appointmentId])

    useEffect(() => {
        fetchRecommendations()
    }, [fetchRecommendations])

    const handleCreate = async (dto: CreateRecommendationDTO | UpdateRecommendationDTO) => {
        setIsCreating(true)
        try {
            await recommendationService.create(
                clientId,
                appointmentId,
                dto as CreateRecommendationDTO,
            )
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
        dto: CreateRecommendationDTO | UpdateRecommendationDTO,
    ) => {
        setUpdatingId(recommendationId)
        try {
            await recommendationService.update(
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
            await recommendationService.delete(clientId, appointmentId, recommendationId)
            toast.success('Recommendation deleted.')
            await fetchRecommendations()
        } catch {
            toast.error('Failed to delete recommendation.')
        }
    }

    const handleReply = async (id: string, reply: string) => {
        try {
            await recommendationService.reply(clientId, appointmentId, id, { reply })
            await fetchRecommendations()
        } catch {
            toast.error('Failed to submit reply.')
        }
    }

    if (isLoading) {
        return <p>Loading recommendations...</p>
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
                <p className="text-muted-foreground text-sm">No recommendations yet.</p>
            ) : (
                <div className="space-y-3">
                    {recommendations.map((recommendation) => (
                        <div key={recommendation.id} className="border rounded-md p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold">{recommendation.name}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Link
                                        to={`/psycho/clients/${clientId}/appointments/${appointmentId}/attachment/${recommendation.id}`}
                                    >
                                        <Button variant="ghost" size="sm">
                                            Open
                                        </Button>
                                    </Link>
                                    <RecommendationForm
                                        mode="edit"
                                        trigger={
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        }
                                        initialData={{
                                            name: recommendation.name ?? '',
                                            text: recommendation.text ?? '',
                                            voiceFiles: recommendation.audioFiles,
                                            imageFiles: recommendation.imageFiles,
                                        }}
                                        isLoading={updatingId === recommendation.id}
                                        onSubmit={(dto) => handleUpdate(recommendation.id, dto)}
                                    />
                                    <ConfirmAction
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                Delete
                                            </Button>
                                        }
                                        title="Delete Recommendation"
                                        description="Are you sure you want to delete this recommendation? This action cannot be undone."
                                        confirmText="Delete"
                                        onConfirm={() => handleDelete(recommendation.id)}
                                    />
                                </div>
                            </div>
                            {recommendation.text && (
                                <p className="text-sm text-muted-foreground">
                                    {recommendation.text}
                                </p>
                            )}
                            {recommendation.reaction && (
                                <div className="space-y-1 pt-1">
                                    <p className="text-xs text-muted-foreground">
                                        Status: {recommendation.reaction.done ? 'Done' : 'Not done'}
                                    </p>
                                    {recommendation.reaction.clientComment && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Client comment:
                                            </p>
                                            <p className="text-sm">
                                                {recommendation.reaction.clientComment}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {recommendation.reaction?.psychologistReply !== null &&
                            recommendation.reaction?.psychologistReply !== undefined ? (
                                <div className="pt-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Your reply:
                                    </p>
                                    <p className="text-sm">
                                        {recommendation.reaction.psychologistReply}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 pt-1">
                                    <Textarea
                                        placeholder="Write a reply..."
                                        value={replyTexts[recommendation.id] ?? ''}
                                        onChange={(e) =>
                                            setReplyTexts((prev) => ({
                                                ...prev,
                                                [recommendation.id]: e.target.value,
                                            }))
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        onClick={async () => {
                                            const text = replyTexts[recommendation.id]?.trim()
                                            if (!text) return
                                            await handleReply(recommendation.id, text)
                                            setReplyTexts((prev) => ({
                                                ...prev,
                                                [recommendation.id]: '',
                                            }))
                                        }}
                                        disabled={!replyTexts[recommendation.id]?.trim()}
                                    >
                                        Submit
                                    </Button>
                                </div>
                            )}
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                {recommendation.imageFiles.length > 0 && (
                                    <span>{recommendation.imageFiles.length} image(s)</span>
                                )}
                                {recommendation.audioFiles.length > 0 && (
                                    <span>{recommendation.audioFiles.length} recording(s)</span>
                                )}
                                <span>
                                    {format(new Date(recommendation.createdAt), 'PPP HH:mm')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
