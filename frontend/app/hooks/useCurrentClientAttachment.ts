import { useParams } from 'react-router'
import type { Attachment, ImpressionCompletion, RecommendationReaction } from '~/models/attachment'
import { attachmentService } from '~/services/attachment.service'
import { useResource } from './useResource'

interface CurrentClientAttachmentData {
    attachment: Attachment
    reaction: RecommendationReaction | null
    completion: ImpressionCompletion | null
}

export function useCurrentClientAttachment(): {
    attachment: Attachment | null
    reaction: RecommendationReaction | null
    completion: ImpressionCompletion | null
    isLoading: boolean
    refetch: () => void
} {
    const { appointmentId, attachmentId } = useParams<{
        appointmentId: string
        attachmentId: string
    }>()

    const { data, isLoading, refetch } = useResource<CurrentClientAttachmentData>(
        () =>
            attachmentService.getByIdForClient(appointmentId!, attachmentId!).then((res) => ({
                attachment: res.data.attachment,
                reaction: res.data.reaction ?? null,
                completion: res.data.completion ?? null,
            })),
        [appointmentId, attachmentId],
        { enabled: !!appointmentId && !!attachmentId },
    )

    return {
        attachment: data?.attachment ?? null,
        reaction: data?.reaction ?? null,
        completion: data?.completion ?? null,
        isLoading,
        refetch,
    }
}
