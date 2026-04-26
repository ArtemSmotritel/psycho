import * as z from 'zod'
import type { AttachmentFile } from '~/models/attachment'
import { getFileUrl } from '../../utils/utils'

export const MAX_VOICE_FILES = 3
export const MAX_IMAGE_FILES = 9

export const attachmentFormSchema = z.object({
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    text: z.string().optional(),
    voiceFiles: z.array(z.any()).max(MAX_VOICE_FILES, {
        message: `Maximum ${MAX_VOICE_FILES} voice recordings allowed`,
    }),
    imageFiles: z.array(z.any()).max(MAX_IMAGE_FILES, {
        message: `Maximum ${MAX_IMAGE_FILES} images allowed`,
    }),
})

export type AttachmentFormValues = z.infer<typeof attachmentFormSchema>

export type AttachmentType = 'note' | 'recommendation' | 'impression'

export type AttachmentFormSubmitValues = AttachmentFormValues & {
    removedFileIds: string[]
}

export type AttachmentFileInput = File | string | AttachmentFile

export interface AttachmentFormInitialData {
    name?: string
    text?: string
    voiceFiles?: AttachmentFileInput[]
    imageFiles?: AttachmentFileInput[]
}

export interface AttachmentFormProps {
    type: AttachmentType
    mode?: 'create' | 'edit'
    trigger: React.ReactNode
    initialData?: AttachmentFormInitialData
    onSubmit: (values: AttachmentFormSubmitValues) => void
    showLibraryPicker?: boolean
}

export function isAttachmentFile(file: AttachmentFileInput): file is AttachmentFile {
    return typeof file === 'object' && !(file instanceof File) && 'id' in file && 'url' in file
}

export function getDisplayUrl(file: AttachmentFileInput): string {
    if (isAttachmentFile(file)) return file.url
    return getFileUrl(file)
}
