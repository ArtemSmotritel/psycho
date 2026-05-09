import { toast } from 'sonner'
import { formatAppDate } from '~/utils/utils'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { EmptyMessage } from './EmptyMessage'
import { Loading } from './Loading'
import { AttachmentForm, type AttachmentFormSubmitValues } from './AttachmentForm'
import {
    attachmentService,
    getCreateAttachmentErrorMessage,
    getDeleteAttachmentErrorMessage,
} from '~/services/attachment.service'
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

    const handleUpdate = async (
        noteId: string,
        values: { name: string; text?: string; removedFileIds?: string[] },
    ) => {
        try {
            await attachmentService.updateForPsycho(clientId, appointmentId, noteId, {
                name: values.name,
                text: values.text,
                removeFileIds:
                    values.removedFileIds && values.removedFileIds.length > 0
                        ? values.removedFileIds
                        : undefined,
            })
            toast.success('Note updated.')
            await fetchNotes()
        } catch {
            toast.error('Failed to update note.')
        }
    }

    const handleDelete = async (noteId: string) => {
        try {
            await attachmentService.deleteForPsycho(clientId, appointmentId, noteId)
            toast.success('Note deleted.')
            await fetchNotes()
        } catch (err) {
            toast.error(getDeleteAttachmentErrorMessage(err))
        }
    }

    if (isLoading) {
        return <Loading text="Loading notes..." />
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

            {notes.length === 0 ? (
                <EmptyMessage title="No notes yet." />
            ) : (
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div key={note.id} className="border rounded-md p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold">{note.name}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Link
                                        to={routes.psycho.attachment(
                                            clientId,
                                            appointmentId,
                                            note.id,
                                        )}
                                    >
                                        <Button variant="ghost" size="sm">
                                            Open
                                        </Button>
                                    </Link>
                                    <AttachmentForm
                                        type="note"
                                        mode="edit"
                                        trigger={
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        }
                                        initialData={{
                                            name: note.name,
                                            text: note.text ?? '',
                                            voiceFiles: note.audioFiles,
                                            imageFiles: note.imageFiles,
                                        }}
                                        onSubmit={(values) =>
                                            handleUpdate(note.id, {
                                                name: values.name,
                                                text: values.text,
                                                removedFileIds: values.removedFileIds,
                                            })
                                        }
                                    />
                                    <ConfirmDeleteButton
                                        itemLabel="Note"
                                        onConfirm={() => handleDelete(note.id)}
                                    />
                                </div>
                            </div>
                            {note.text && (
                                <p className="text-sm text-muted-foreground">{note.text}</p>
                            )}
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                {note.imageFiles.length > 0 && (
                                    <span>{note.imageFiles.length} image(s)</span>
                                )}
                                {note.audioFiles.length > 0 && (
                                    <span>{note.audioFiles.length} recording(s)</span>
                                )}
                                <span>{formatAppDate(note.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
