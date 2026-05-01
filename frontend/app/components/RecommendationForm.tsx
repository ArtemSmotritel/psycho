import { toast } from 'sonner'
import { AttachmentForm, type AttachmentFormSubmitValues, isAttachmentFile } from './AttachmentForm'
import { fileService } from '~/services/file.service'
import type { AttachmentFile, UpdateRecommendationDTO } from '~/models/attachment'

export interface RecommendationFormCreateDTO {
    name: string
    text?: string
    imageFileIds: string[]
    audioFileIds: string[]
}

interface RecommendationFormProps {
    mode: 'create' | 'edit'
    trigger: React.ReactNode
    initialData?: {
        name: string
        text?: string
        voiceFiles?: AttachmentFile[]
        imageFiles?: AttachmentFile[]
    }
    isLoading: boolean
    onSubmit: (dto: RecommendationFormCreateDTO | UpdateRecommendationDTO) => void
}

export function RecommendationForm({
    mode,
    trigger,
    initialData,
    isLoading: _isLoading,
    onSubmit,
}: RecommendationFormProps) {
    const handleSubmit = async (values: AttachmentFormSubmitValues) => {
        if (mode === 'edit') {
            const dto: UpdateRecommendationDTO = {
                name: values.name,
                text: values.text,
                removeFileIds: values.removedFileIds.length > 0 ? values.removedFileIds : undefined,
            }
            onSubmit(dto)
            return
        }

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
                } else if (isAttachmentFile(f)) {
                    imageFileIds.push(f.id)
                }
            }

            const dto: RecommendationFormCreateDTO = {
                name: values.name,
                text: values.text,
                audioFileIds,
                imageFileIds,
            }
            onSubmit(dto)
        } catch {
            toast.error('Failed to upload files. Please try again.')
        }
    }

    return (
        <AttachmentForm
            type="recommendation"
            mode={mode}
            trigger={trigger}
            initialData={initialData}
            onSubmit={handleSubmit}
            showLibraryPicker
        />
    )
}
