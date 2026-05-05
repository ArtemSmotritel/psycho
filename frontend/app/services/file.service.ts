import { api } from './api'
import type { FileUploadResponse } from '~/models/file'
import {
    isAttachmentFile,
    type AttachmentFormSubmitValues,
} from '~/components/attachment-form/schema'

export const fileService = {
    upload: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post<FileUploadResponse>('/files/upload', formData)
    },
}

export async function resolveAttachmentFileIds(
    values: Pick<AttachmentFormSubmitValues, 'voiceFiles' | 'imageFiles'>,
): Promise<{ audioFileIds: string[]; imageFileIds: string[] }> {
    const audioFileIds: string[] = []
    for (const f of values.voiceFiles) {
        if (f instanceof File) {
            const { data } = await fileService.upload(f)
            audioFileIds.push(data.id)
        }
    }

    const imageFileIds: string[] = []
    for (const f of values.imageFiles) {
        if (f instanceof File) {
            const { data } = await fileService.upload(f)
            imageFileIds.push(data.id)
        } else if (isAttachmentFile(f)) {
            imageFileIds.push(f.id)
        }
    }

    return { audioFileIds, imageFileIds }
}
