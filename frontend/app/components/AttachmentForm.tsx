import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useReactMediaRecorder } from 'react-media-recorder'
import { getAttachmentTypeLabel } from '../utils/utils'
import { Separator } from './ui/separator'
import { useAttachmentFiles } from '~/hooks/useAttachmentFiles'
import {
    attachmentFormSchema,
    isAttachmentFile,
    type AttachmentFormProps,
    type AttachmentFormSubmitValues,
    type AttachmentFormValues,
} from './attachment-form/schema'
import { VoiceRecordingSection } from './attachment-form/VoiceRecordingSection'
import { ImageSection } from './attachment-form/ImageSection'

export { isAttachmentFile }
export type { AttachmentFormSubmitValues }

export function AttachmentForm({
    type,
    mode = 'create',
    trigger,
    initialData,
    onSubmit,
    showLibraryPicker = false,
}: AttachmentFormProps) {
    const [open, setOpen] = useState(false)

    const form = useForm<AttachmentFormValues>({
        resolver: zodResolver(attachmentFormSchema),
        defaultValues: {
            name: '',
            text: '',
            voiceFiles: [],
            imageFiles: [],
            ...initialData,
        },
    })

    const {
        voiceFiles,
        imageFiles,
        removedFileIds,
        requestVoiceRecordingSlot,
        appendVoiceFile,
        addImageFiles,
        addLibraryImage,
        toggleFileRemoval,
        isFileMarkedForRemoval,
    } = useAttachmentFiles({
        open,
        initialData,
        onError: (section, message) => form.setError(section, { type: 'manual', message }),
    })

    const { status, startRecording, stopRecording, clearBlobUrl } = useReactMediaRecorder({
        audio: true,
        onStop: (blobUrl, blob) => {
            if (blob) {
                const file = new File([blob], `recording-${Date.now()}.wav`, { type: 'audio/wav' })
                appendVoiceFile(file)
                clearBlobUrl()
            }
        },
    })

    function handleSubmit(values: AttachmentFormValues) {
        onSubmit({
            ...values,
            voiceFiles,
            imageFiles,
            removedFileIds,
        })
        setOpen(false)
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addImageFiles(Array.from(e.target.files || []))
    }

    const handleStartRecording = () => {
        if (!requestVoiceRecordingSlot()) return
        startRecording()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'edit' ? 'Edit' : 'Create'} {getAttachmentTypeLabel(type)}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? `Edit the name and text of this ${type.toLowerCase()}.`
                            : `Add a new ${type.toLowerCase()} with optional text, voice recordings, and images.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-4 overflow-y-auto pr-2"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder={`Enter ${type} name...`} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Text (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`Enter ${type} text...`}
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />

                        <div className="space-y-4">
                            <VoiceRecordingSection
                                mode={mode}
                                status={status}
                                voiceFiles={voiceFiles}
                                errorMessage={form.formState.errors.voiceFiles?.message}
                                onStartRecording={handleStartRecording}
                                onStopRecording={stopRecording}
                                onToggleFileRemoval={toggleFileRemoval}
                                isFileMarkedForRemoval={isFileMarkedForRemoval}
                            />

                            <Separator />

                            <ImageSection
                                mode={mode}
                                imageFiles={imageFiles}
                                showLibraryPicker={showLibraryPicker}
                                errorMessage={form.formState.errors.imageFiles?.message}
                                onImageFileChange={handleImageFileChange}
                                onLibraryImageSelect={addLibraryImage}
                                onToggleFileRemoval={toggleFileRemoval}
                                isFileMarkedForRemoval={isFileMarkedForRemoval}
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {mode === 'edit' ? 'Save' : 'Create'} {getAttachmentTypeLabel(type)}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
