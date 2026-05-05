import { useParams } from 'react-router'
import type { Attachment, RecommendationReaction } from '~/models/attachment'
import { attachmentService } from '~/services/attachment.service'
import { useResource } from './useResource'

interface CurrentAttachmentData {
    attachment: Attachment
    reaction: RecommendationReaction | null
}

export function useCurrentAttachment(): {
    attachment: Attachment | null
    reaction: RecommendationReaction | null
    isLoading: boolean
    refetch: () => void
} {
    const { clientId, appointmentId, attachmentId } = useParams<{
        clientId: string
        appointmentId: string
        attachmentId: string
    }>()

    const { data, isLoading, refetch } = useResource<CurrentAttachmentData>(
        () =>
            attachmentService
                .getByIdForPsycho(clientId!, appointmentId!, attachmentId!)
                .then((res) => ({
                    attachment: res.data.attachment,
                    reaction: res.data.reaction ?? null,
                })),
        [clientId, appointmentId, attachmentId],
        { enabled: !!clientId && !!appointmentId && !!attachmentId },
    )

    return {
        attachment: data?.attachment ?? null,
        reaction: data?.reaction ?? null,
        isLoading,
        refetch,
    }
}
