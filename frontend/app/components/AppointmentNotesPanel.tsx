import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { AttachmentForm, type AttachmentFormSubmitValues } from './AttachmentForm'
import { AttachmentList } from './AttachmentList'
import { AttachmentListItem } from './AttachmentListItem'
import { EditAttachmentButton } from './EditAttachmentButton'
import { DeleteAttachmentButton } from './DeleteAttachmentButton'
import { attachmentService, getCreateAttachmentErrorMessage } from '~/services/attachment.service'
import { resolveAttachmentFileIds } from '~/services/file.service'
import { routes } from '~/lib/routes'
import { ATTACHMENT_LIMITS } from '~/lib/attachment-limits'
import { useResource } from '~/hooks/useResource'
import type { Attachment } from '~/models/attachment'

interface AppointmentNotesPanelProps {
    clientId: string
    appointmentId: string
}

export function AppointmentNotesPanel({ clientId, appointmentId }: AppointmentNotesPanelProps) {
    const {
        data,
        isLoading,
        error,
        refetch: fetchNotes,
    } = useResource<Attachment[]>(
        () =>
            attachmentService
                .listForPsycho(clientId, appointmentId, 'note')
                .then((res) => res.data.notes),
        [clientId, appointmentId],
        { initial: [], errorMessage: 'Failed to load notes.' },
    )
    const notes = data ?? []

    const handleCreate = async (values: AttachmentFormSubmitValues) => {
        try {
            const { audioFileIds, imageFileIds } = await resolveAttachmentFileIds(values)

            await attachmentService.createForPsycho(clientId, appointmentId, {
                type: 'note',
                name: values.name,
                text: values.text,
                audioFileIds,
                imageFileIds,
            })
            toast.success('Note created.')
            await fetchNotes()
        } catch (err) {
            toast.error(getCreateAttachmentErrorMessage(err, 'Failed to create note.'))
        }
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    const noteLimit = ATTACHMENT_LIMITS.note
    const atLimit = notes.length >= noteLimit

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                    Notes{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                        {notes.length}/{noteLimit}
                    </span>
                </h3>
                <AttachmentForm
                    type="note"
                    mode="create"
                    trigger={
                        <Button
                            size="sm"
                            disabled={atLimit}
                            title={
                                atLimit
                                    ? `Maximum ${noteLimit} notes per appointment reached.`
                                    : undefined
                            }
                        >
                            Add Note
                        </Button>
                    }
                    onSubmit={handleCreate}
                    showLibraryPicker
                />
            </div>

            <AttachmentList
                items={notes}
                isLoading={isLoading}
                loadingText="Loading notes..."
                emptyMessage="No notes yet."
                renderItem={(note) => (
                    <AttachmentListItem
                        attachment={note}
                        detailHref={routes.psycho.attachment(clientId, appointmentId, note.id)}
                        trailingActions={
                            <>
                                <EditAttachmentButton
                                    role="psycho"
                                    clientId={clientId}
                                    appointmentId={appointmentId}
                                    attachment={note}
                                    onSuccess={fetchNotes}
                                />
                                <DeleteAttachmentButton
                                    role="psycho"
                                    clientId={clientId}
                                    appointmentId={appointmentId}
                                    attachment={note}
                                    onSuccess={fetchNotes}
                                />
                            </>
                        }
                    />
                )}
            />
        </div>
    )
}
