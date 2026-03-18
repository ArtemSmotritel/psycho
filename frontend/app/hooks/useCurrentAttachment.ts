import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Attachment } from '~/models/attachment'
import { attachmentService } from '~/services/attachment.service'

export function useCurrentAttachment(): {
    attachment: Attachment | null
    isLoading: boolean
    refetch: () => void
} {
    const { clientId, appointmentId, attachmentId } =
        useParams<{ clientId: string; appointmentId: string; attachmentId: string }>()
    const [attachment, setAttachment] = useState<Attachment | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const fetchAttachment = useCallback(() => {
        if (!clientId || !appointmentId || !attachmentId) {
            setAttachment(null)
            return
        }

        setIsLoading(true)
        attachmentService
            .getById(clientId, appointmentId, attachmentId)
            .then((res) => setAttachment(res.data.attachment))
            .catch(() => setAttachment(null))
            .finally(() => setIsLoading(false))
    }, [clientId, appointmentId, attachmentId])

    useEffect(() => {
        fetchAttachment()
    }, [fetchAttachment])

    return { attachment, isLoading, refetch: fetchAttachment }
}
