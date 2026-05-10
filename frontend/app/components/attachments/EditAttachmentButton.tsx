import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { AttachmentForm, type AttachmentFormSubmitValues } from './AttachmentForm'
import { getAttachmentDetailCapabilities } from './attachment-detail-capabilities'
import { attachmentService } from '~/services/attachment.service'
import { getAttachmentTypeLabel } from '~/utils/utils'
import type { Attachment } from '~/models/attachment'
import { useUserRole } from '~/contexts/auth-context'
import { logIfNotProd } from '~/utils/logger'

interface EditAttachmentButtonProps {
    appointmentId: string
    attachment: Attachment
    clientId?: string
    trigger?: ReactNode
    onSuccess: () => void
}

export function EditAttachmentButton({
    appointmentId,
    attachment,
    clientId,
    trigger,
    onSuccess,
}: EditAttachmentButtonProps) {
    const role = useUserRole()
    if (!role) return null

    const capabilities = getAttachmentDetailCapabilities(role, attachment)
    if (!capabilities.canEdit) return null

    if (!clientId) {
        logIfNotProd('[EditAttachmentButton] role=psycho requires a clientId; rendering nothing.')
        return null
    }

    const typeLabel = getAttachmentTypeLabel(attachment.type)

    const handleSubmit = async (values: AttachmentFormSubmitValues) => {
        try {
            await attachmentService.updateForPsycho(clientId, appointmentId, attachment.id, {
                name: values.name,
                text: values.text,
                removeFileIds: values.removedFileIds.length > 0 ? values.removedFileIds : undefined,
            })
            toast.success(`${typeLabel} updated.`)
            onSuccess()
        } catch {
            toast.error(`Failed to update ${typeLabel.toLowerCase()}.`)
        }
    }

    const defaultTrigger = (
        <Button variant="ghost" size="sm">
            Edit
        </Button>
    )

    return (
        <AttachmentForm
            type={attachment.type}
            mode="edit"
            trigger={trigger ?? defaultTrigger}
            initialData={{
                name: attachment.name,
                text: attachment.text ?? '',
                voiceFiles: attachment.audioFiles,
                imageFiles: attachment.imageFiles,
            }}
            onSubmit={handleSubmit}
        />
    )
}
