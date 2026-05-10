import { toast } from 'sonner'
import { AttachmentForm, type AttachmentFormSubmitValues } from '../AttachmentForm'
import { AttachmentList } from '../AttachmentList'
import { AttachmentListItem } from '../AttachmentListItem'
import { AttachmentListHeader } from '../AttachmentListHeader'
import { LimitedAddButton } from '../LimitedAddButton'
import { EditAttachmentButton } from '../EditAttachmentButton'
import { DeleteAttachmentButton } from '../DeleteAttachmentButton'
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

    return (
        <div className="space-y-4">
            <AttachmentListHeader
                title="Notes"
                count={notes.length}
                limit={noteLimit}
                action={
                    <AttachmentForm
                        type="note"
                        mode="create"
                        trigger={
                            <LimitedAddButton
                                count={notes.length}
                                limit={noteLimit}
                                label="Add Note"
                                tooltipNoun="notes"
                            />
                        }
                        onSubmit={handleCreate}
                        showLibraryPicker
                    />
                }
            />

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
                                    clientId={clientId}
                                    appointmentId={appointmentId}
                                    attachment={note}
                                    onSuccess={fetchNotes}
                                />
                                <DeleteAttachmentButton
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
