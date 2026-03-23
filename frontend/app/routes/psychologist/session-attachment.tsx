import { Edit, Mic, Image as ImageIcon, Trash2, User, ArrowRight, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentAttachment } from '~/hooks/useCurrentAttachment'
import { AttachmentIcon } from '~/utils/componentUtils'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { CompleteImpressionForm } from '@/components/CompleteImpressionForm'
import { AttachmentForm } from '@/components/AttachmentForm'
import { EmptyMessage } from '@/components/EmptyMessage'
import { useState } from 'react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import { getAttachmentTypeLabel, formatAppDate } from '~/utils/utils'
import { ImagePreview } from '~/components/ImagePreview'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { noteService } from '~/services/note.service'
import { recommendationService } from '~/services/recommendation.service'
import type { AttachmentFile } from '~/models/attachment'

interface ImageAttachmentsProps {
    files: AttachmentFile[]
}

function ImageAttachments({ files }: ImageAttachmentsProps) {
    if (!files || files.length === 0) {
        return (
            <EmptyMessage
                title="No Images"
                description="This attachment doesn't have any images yet."
            />
        )
    }

    return (
        <Carousel
            className="w-full md:max-w-3xl lg:max-w-5xl max-w-xs"
            opts={{ loop: true, align: 'start' }}
        >
            <CarouselContent>
                {files.map((file, index) => (
                    <CarouselItem key={index} className="sm:basis-1/1 md:basis-1/2 lg:basis-1/3">
                        <ImagePreview src={file.url} alt={`Attachment image ${index + 1}`} />
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    )
}

interface VoiceAttachmentsProps {
    files: AttachmentFile[]
}

function VoiceAttachments({ files }: VoiceAttachmentsProps) {
    if (!files || files.length === 0) {
        return (
            <EmptyMessage
                title="No Voice Recordings"
                description="This attachment doesn't have any voice recordings yet."
            />
        )
    }

    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
                <div key={index} className="w-full max-w-md p-4 rounded-lg border">
                    <audio controls className="w-full">
                        <source src={file.url} type="audio/wav" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            ))}
        </div>
    )
}
// TODO add client response if present.
export default function SessionAttachment() {
    const { attachment, isLoading, refetch } = useCurrentAttachment()
    const { clientId, appointmentId } = useParams()
    const navigate = useNavigate()
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
    const { userRole } = useRoleGuard(['psychologist', 'client'])

    if (isLoading) return <p>Loading...</p>

    if (!attachment) {
        return <div>Attachment not found</div>
    }

    const canEditAttachment = userRole === 'psychologist' && attachment.type !== 'impression'
    const canDeleteAttachment = userRole === 'psychologist' && attachment.type !== 'impression'

    const handleDeleteAttachment = async () => {
        try {
            if (attachment.type === 'note') {
                await noteService.delete(clientId!, appointmentId!, attachment.id)
            } else if (attachment.type === 'recommendation') {
                await recommendationService.delete(clientId!, appointmentId!, attachment.id)
            }
            toast.success('Attachment deleted.')
            navigate(`/psycho/clients/${clientId}/appointments/${appointmentId}`)
        } catch {
            toast.error('Failed to delete attachment. Please try again.')
        }
    }

    const handleComplete = async (_values: { response: string }) => {
        // TODO: Implement once the backend completion endpoint is available
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
            if (attachment.type === 'note') {
                await noteService.update(clientId!, appointmentId!, attachment.id, updateData)
            } else if (attachment.type === 'recommendation') {
                await recommendationService.update(
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
                    <h1 className="text-2xl font-bold">{attachment.name}</h1>
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

                <Link to={`/psycho/clients/${clientId}`}>
                    <ActionItem
                        icon={<User className="h-6" />}
                        label={`Open ${userRole === 'client' ? 'My' : 'Client'} Profile`}
                    />
                </Link>

                <Link to={`/psycho/clients/${clientId}/appointments/${appointmentId}`}>
                    <ActionItem icon={<ArrowRight className="h-6" />} label="Open Session" />
                </Link>

                {attachment.type === 'impression' && userRole === 'client' && (
                    <ActionItem
                        icon={<CheckCircle className="h-6" />}
                        label="Complete"
                        onClick={() => setIsCompleteDialogOpen(true)}
                    />
                )}

                {canDeleteAttachment && (
                    <ConfirmAction
                        trigger={
                            <ActionItem
                                icon={<Trash2 className="h-6" />}
                                label="Delete Attachment"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                            />
                        }
                        title="Delete Attachment"
                        description="Are you sure you want to delete this attachment? This action cannot be undone."
                        confirmText="Delete"
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

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Mic className="h-5 w-5" />
                        <h3 className="text-lg font-medium">Voice Recordings</h3>
                    </div>
                    <VoiceAttachments files={attachment.audioFiles} />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        <h3 className="text-lg font-medium">Images</h3>
                    </div>
                    <div className="px-10">
                        <ImageAttachments files={attachment.imageFiles} />
                    </div>
                </div>
            </div>

            <CompleteImpressionForm
                isOpen={isCompleteDialogOpen}
                onClose={() => setIsCompleteDialogOpen(false)}
                onSubmit={handleComplete}
            />
        </>
    )
}
