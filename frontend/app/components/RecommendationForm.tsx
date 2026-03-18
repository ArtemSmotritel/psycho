import { toast } from 'sonner'
import { AttachmentForm } from './AttachmentForm'
import { fileService } from '~/services/file.service'
import type { CreateRecommendationDTO, UpdateRecommendationDTO } from '~/models/attachment'

interface RecommendationFormProps {
    mode: 'create' | 'edit'
    trigger: React.ReactNode
    initialData?: { name: string; text?: string }
    isLoading: boolean
    onSubmit: (dto: CreateRecommendationDTO | UpdateRecommendationDTO) => void
}

export function RecommendationForm({
    mode,
    trigger,
    initialData,
    isLoading: _isLoading,
    onSubmit,
}: RecommendationFormProps) {
    const handleSubmit = async (values: {
        name: string
        text?: string
        voiceFiles: (File | string)[]
        imageFiles: (File | string)[]
    }) => {
        if (mode === 'edit') {
            const dto: UpdateRecommendationDTO = {
                name: values.name,
                text: values.text,
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
                }
            }

            const dto: CreateRecommendationDTO = {
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
        />
    )
}
