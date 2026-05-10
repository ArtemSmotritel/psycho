import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { getAttachmentDetailCapabilities } from './attachment-detail-capabilities'
import { attachmentService, getDeleteAttachmentErrorMessage } from '~/services/attachment.service'
import { getAttachmentTypeLabel } from '~/utils/utils'
import type { Attachment } from '~/models/attachment'
import { ConfirmDeleteButton } from '../common/ConfirmDeleteButton'
import { useUserRole } from '~/contexts/auth-context'
import { logIfNotProd } from '~/utils/logger'

interface DeleteAttachmentButtonProps {
    appointmentId: string
    attachment: Attachment
    clientId?: string
    trigger?: ReactNode
    onSuccess: () => void
}

export function DeleteAttachmentButton({
    appointmentId,
    attachment,
    clientId,
    trigger,
    onSuccess,
}: DeleteAttachmentButtonProps) {
    const role = useUserRole()
    if (!role) return null

    const capabilities = getAttachmentDetailCapabilities(role, attachment)
    if (!capabilities.canDelete) return null

    if (role === 'psycho' && !clientId) {
        logIfNotProd('[DeleteAttachmentButton] role=psycho requires a clientId; rendering nothing.')
        return null
    }

    const typeLabel = getAttachmentTypeLabel(attachment.type)

    const handleConfirm = async () => {
        try {
            if (role === 'psycho') {
                await attachmentService.deleteForPsycho(clientId!, appointmentId, attachment.id)
            } else {
                await attachmentService.deleteForClient(appointmentId, attachment.id)
            }
            toast.success(`${typeLabel} deleted.`)
            onSuccess()
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
        }
    }

    return <ConfirmDeleteButton itemLabel={typeLabel} trigger={trigger} onConfirm={handleConfirm} />
}
