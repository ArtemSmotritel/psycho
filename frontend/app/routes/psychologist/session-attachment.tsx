import { Edit, Trash2, User, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton'
import { Loading } from '~/components/Loading'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentAttachment } from '~/hooks/useCurrentAttachment'
import { AttachmentIcon } from '~/utils/componentUtils'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { AttachmentForm } from '@/components/AttachmentForm'
import { AttachmentMediaPreview } from '~/components/AttachmentMediaPreview'
import { getAttachmentTypeLabel, formatAppDate, formatAttachmentTitle } from '~/utils/utils'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { attachmentService, getDeleteAttachmentErrorMessage } from '~/services/attachment.service'
import { routes } from '~/lib/routes'

export default function SessionAttachment() {
    const { attachment, isLoading, refetch } = useCurrentAttachment()
    const { clientId, appointmentId } = useParams()
    const navigate = useNavigate()
    useRoleGuard(['psychologist'])

    if (isLoading) return <Loading />

    if (!attachment) {
        return <div>Attachment not found</div>
    }

    const canEditAttachment = attachment.type !== 'impression'
    const canDeleteAttachment = attachment.type !== 'impression'

    const handleDeleteAttachment = async () => {
        try {
            await attachmentService.deleteForPsycho(clientId!, appointmentId!, attachment.id)
            toast.success('Attachment deleted.')
            navigate(routes.psycho.appointment(clientId!, appointmentId!))
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
        }
    }

    const handleEdit = async (values: {
        name: string
        text?: string
        removedFileIds: string[]
    }) => {
        try {
            const updateData = {
                name: values.name,
                text: values.text,
                removeFileIds: values.removedFileIds.length > 0 ? values.removedFileIds : undefined,
            }
            if (attachment.type === 'note' || attachment.type === 'recommendation') {
                await attachmentService.updateForPsycho(
                    clientId!,
                    appointmentId!,
                    attachment.id,
                    updateData,
                )
            }
            toast.success('Attachment updated.')
            refetch()
        } catch {
            toast.error('Failed to update attachment. Please try again.')
        }
    }

    return (
        <>
            <div className="flex items-center gap-4">
                <AttachmentIcon type={attachment.type} size="h-8 w-8" />
                <div>
                    <h1 className="text-2xl font-bold">{formatAttachmentTitle(attachment)}</h1>
                    <p className="text-sm text-muted-foreground">
                        {getAttachmentTypeLabel(attachment.type)} &middot;{' '}
                        {formatAppDate(attachment.createdAt)}
                    </p>
                </div>
            </div>

            <ActionsSection title="Actions">
                {canEditAttachment && (
                    <AttachmentForm
                        type={attachment.type}
                        trigger={
                            <ActionItem icon={<Edit className="h-6" />} label="Edit Attachment" />
                        }
                        initialData={{
                            name: attachment.name ?? '',
                            text: attachment.text ?? '',
                            voiceFiles: attachment.audioFiles,
                            imageFiles: attachment.imageFiles,
                        }}
                        onSubmit={handleEdit}
                    />
                )}

                <Link to={routes.psycho.client(clientId!)}>
                    <ActionItem icon={<User className="h-6" />} label="Open Client Profile" />
                </Link>

                <Link to={routes.psycho.appointment(clientId!, appointmentId!)}>
                    <ActionItem icon={<ArrowRight className="h-6" />} label="Open Session" />
                </Link>

                {canDeleteAttachment && (
                    <ConfirmDeleteButton
                        itemLabel="Attachment"
                        trigger={
                            <ActionItem
                                icon={<Trash2 className="h-6" />}
                                label="Delete Attachment"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                            />
                        }
                        onConfirm={handleDeleteAttachment}
                    />
                )}
            </ActionsSection>

            <div className="space-y-8">
                {attachment.text && (
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Description</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {attachment.text}
                        </p>
                    </div>
                )}

                <AttachmentMediaPreview
                    audioFiles={attachment.audioFiles}
                    imageFiles={attachment.imageFiles}
                />
            </div>
        </>
    )
}
