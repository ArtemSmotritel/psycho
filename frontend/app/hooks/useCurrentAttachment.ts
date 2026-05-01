import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Attachment, ImpressionCompletion, RecommendationReaction } from '~/models/attachment'
import { attachmentService } from '~/services/attachment.service'

export function useCurrentAttachment(): {
    attachment: Attachment | null
    reaction: RecommendationReaction | null
    completion: ImpressionCompletion | null
    isLoading: boolean
    refetch: () => void
} {
    const { clientId, appointmentId, attachmentId } = useParams<{
        clientId: string
        appointmentId: string
        attachmentId: string
    }>()
    const [attachment, setAttachment] = useState<Attachment | null>(null)
    const [reaction, setReaction] = useState<RecommendationReaction | null>(null)
    const [completion, setCompletion] = useState<ImpressionCompletion | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const fetchAttachment = useCallback(() => {
        if (!clientId || !appointmentId || !attachmentId) {
            setAttachment(null)
            setReaction(null)
            setCompletion(null)
            return
        }

        setIsLoading(true)
        attachmentService
            .getById(clientId, appointmentId, attachmentId)
            .then((res) => {
                setAttachment(res.data.attachment)
                setReaction(res.data.reaction ?? null)
                setCompletion(res.data.completion ?? null)
            })
            .catch(() => {
                setAttachment(null)
                setReaction(null)
                setCompletion(null)
            })
            .finally(() => setIsLoading(false))
    }, [clientId, appointmentId, attachmentId])

    useEffect(() => {
        fetchAttachment()
    }, [fetchAttachment])

    return { attachment, reaction, completion, isLoading, refetch: fetchAttachment }
}
