import { useRef } from 'react'
import { toast } from 'sonner'
import { AttachmentForm, type AttachmentFormSubmitValues } from '~/components/AttachmentForm'
import { attachmentService, getCreateAttachmentErrorMessage } from '~/services/attachment.service'
import { resolveAttachmentFileIds } from '~/services/file.service'
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
            const { audioFileIds, imageFileIds } = await resolveAttachmentFileIds(values)

            const res = await attachmentService.createForClient(appointmentId, {
                type: 'impression',
                name: values.name,
                text: values.text,
                imageFileIds,
                audioFileIds,
            })
            toast.success('Impression saved.')
            onSubmitted(res.data.attachment)
        } catch (err) {
            submittedRef.current = false
            toast.error(
                getCreateAttachmentErrorMessage(
                    err,
                    'Failed to submit impression. Please try again.',
                ),
            )
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
