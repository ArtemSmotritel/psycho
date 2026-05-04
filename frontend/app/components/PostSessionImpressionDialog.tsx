import { useRef } from 'react'
import { toast } from 'sonner'
import {
    AttachmentForm,
    type AttachmentFormSubmitValues,
    isAttachmentFile,
} from '~/components/AttachmentForm'
import { attachmentService } from '~/services/attachment.service'
import { fileService } from '~/services/file.service'
import type { Attachment } from '~/models/attachment'

interface PostSessionImpressionDialogProps {
    open: boolean
    appointmentId: string
    onSubmitted: (impression: Attachment) => void
    onSkip: () => void
}

export function PostSessionImpressionDialog({
    open,
    appointmentId,
    onSubmitted,
    onSkip,
}: PostSessionImpressionDialogProps) {
    const submittedRef = useRef(false)

    const handleSubmit = async (values: AttachmentFormSubmitValues) => {
        submittedRef.current = true
        try {
            const audioFileIds: string[] = []
            for (const f of values.voiceFiles) {
                if (f instanceof File) {
                    const res = await fileService.upload(f)
                    audioFileIds.push(res.data.id)
                }
            }

            const imageFileIds: string[] = []
            for (const f of values.imageFiles) {
                if (f instanceof File) {
                    const res = await fileService.upload(f)
                    imageFileIds.push(res.data.id)
                } else if (isAttachmentFile(f)) {
                    imageFileIds.push(f.id)
                }
            }

            const res = await attachmentService.createForClient(appointmentId, {
                type: 'impression',
                name: values.name,
                text: values.text,
                imageFileIds,
                audioFileIds,
            })
            toast.success('Impression saved.')
            onSubmitted(res.data.attachment)
        } catch {
            submittedRef.current = false
            toast.error('Failed to submit impression. Please try again.')
        }
    }

    const handleOpenChange = (next: boolean) => {
        if (!next && !submittedRef.current) {
            onSkip()
        }
    }

    return (
        <AttachmentForm
            type="impression"
            mode="create"
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            title="Session Ended"
            description="Your psychologist has ended the session. How did it feel? Share an impression now or skip and add one later from the summary."
        />
    )
}
