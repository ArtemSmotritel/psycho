import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { ConfirmAction } from './ConfirmAction'
import { AttachmentForm, type AttachmentFormSubmitValues } from './AttachmentForm'
import { noteService } from '~/services/note.service'
import { fileService } from '~/services/file.service'
import type { Attachment } from '~/models/attachment'

interface AppointmentNotesPanelProps {
    clientId: string
    appointmentId: string
}

export function AppointmentNotesPanel({ clientId, appointmentId }: AppointmentNotesPanelProps) {
    const [notes, setNotes] = useState<Attachment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchNotes = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await noteService.getList(clientId, appointmentId)
            setNotes(res.data.notes)
        } catch {
            setError('Failed to load notes.')
        } finally {
            setIsLoading(false)
        }
    }, [clientId, appointmentId])

    useEffect(() => {
        fetchNotes()
    }, [fetchNotes])

    const handleCreate = async (values: AttachmentFormSubmitValues) => {
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
                }
            }

            await noteService.create(clientId, appointmentId, {
                name: values.name,
                text: values.text,
                audioFileIds,
                imageFileIds,
            })
            toast.success('Note created.')
            await fetchNotes()
        } catch {
            toast.error('Failed to create note.')
        }
    }

    const handleUpdate = async (
        noteId: string,
        values: { name: string; text?: string; removedFileIds?: string[] },
    ) => {
        try {
            await noteService.update(clientId, appointmentId, noteId, {
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
            await noteService.delete(clientId, appointmentId, noteId)
            toast.success('Note deleted.')
            await fetchNotes()
        } catch {
            toast.error('Failed to delete note.')
        }
    }

    if (isLoading) {
        return <p>Loading notes...</p>
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notes</h3>
                <AttachmentForm
                    type="note"
                    mode="create"
                    trigger={<Button size="sm">Add Note</Button>}
                    onSubmit={handleCreate}
                />
            </div>

            {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No notes yet.</p>
            ) : (
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div key={note.id} className="border rounded-md p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold">{note.name}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Link
                                        to={`/psycho/clients/${clientId}/appointments/${appointmentId}/attachment/${note.id}`}
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
                                            name: note.name ?? '',
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
                                    <ConfirmAction
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                Delete
                                            </Button>
                                        }
                                        title="Delete Note"
                                        description="Are you sure you want to delete this note? This action cannot be undone."
                                        confirmText="Delete"
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
                                <span>{format(new Date(note.createdAt), 'PPP HH:mm')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
