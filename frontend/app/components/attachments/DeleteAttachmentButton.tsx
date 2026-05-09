import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { getAttachmentDetailCapabilities } from './attachment-detail-capabilities'
import { attachmentService, getDeleteAttachmentErrorMessage } from '~/services/attachment.service'
import { getAttachmentTypeLabel } from '~/utils/utils'
import type { Attachment } from '~/models/attachment'
import { ConfirmDeleteButton } from '../common/ConfirmDeleteButton'

type DeleteAttachmentButtonProps =
    | {
          role: 'psycho'
          clientId: string
          appointmentId: string
          attachment: Attachment
          trigger?: ReactNode
          onSuccess: () => void
      }
    | {
          role: 'client'
          appointmentId: string
          attachment: Attachment
          trigger?: ReactNode
          onSuccess: () => void
      }

export function DeleteAttachmentButton(props: DeleteAttachmentButtonProps) {
    const capabilities = getAttachmentDetailCapabilities(props.role, props.attachment)
    if (!capabilities.canDelete) return null

    const { attachment, trigger, onSuccess } = props
    const typeLabel = getAttachmentTypeLabel(attachment.type)

    const handleConfirm = async () => {
        try {
            if (props.role === 'psycho') {
                await attachmentService.deleteForPsycho(
                    props.clientId,
                    props.appointmentId,
                    attachment.id,
                )
            } else {
                await attachmentService.deleteForClient(props.appointmentId, attachment.id)
            }
            toast.success(`${typeLabel} deleted.`)
            onSuccess()
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
        }
    }

    return <ConfirmDeleteButton itemLabel={typeLabel} trigger={trigger} onConfirm={handleConfirm} />
}
