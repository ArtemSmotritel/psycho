import { useEffect, useState } from 'react'
import {
    MAX_IMAGE_FILES,
    MAX_VOICE_FILES,
    isAttachmentFile,
    type AttachmentFileInput,
    type AttachmentFormInitialData,
} from '~/components/attachment-form/schema'
import type { AttachmentFile } from '~/models/attachment'
import type { AssociativeImage } from '~/models/associative-image'

type VoiceSection = 'voiceFiles'
type ImageSection = 'imageFiles'
type AttachmentErrorSection = VoiceSection | ImageSection

interface UseAttachmentFilesOptions {
    open: boolean
    initialData?: AttachmentFormInitialData
    onError: (section: AttachmentErrorSection, message: string) => void
}

export interface UseAttachmentFilesResult {
    voiceFiles: AttachmentFileInput[]
    imageFiles: AttachmentFileInput[]
    removedFileIds: string[]
    requestVoiceRecordingSlot: () => boolean
    appendVoiceFile: (file: File) => void
    addImageFiles: (files: File[]) => void
    addLibraryImage: (image: AssociativeImage) => void
    toggleFileRemoval: (file: AttachmentFileInput) => void
    isFileMarkedForRemoval: (file: AttachmentFileInput) => boolean
}

export function useAttachmentFiles({
    open,
    initialData,
    onError,
}: UseAttachmentFilesOptions): UseAttachmentFilesResult {
    const [voiceFiles, setVoiceFiles] = useState<AttachmentFileInput[]>([])
    const [imageFiles, setImageFiles] = useState<AttachmentFileInput[]>([])
    const [removedFileIds, setRemovedFileIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (open && initialData) {
            if (initialData.voiceFiles) {
                setVoiceFiles(initialData.voiceFiles)
            }
            if (initialData.imageFiles) {
                setImageFiles(initialData.imageFiles)
            }
            setRemovedFileIds(new Set())
        }
    }, [open, initialData])

    useEffect(() => {
        return () => {
            voiceFiles.forEach((file) => {
                if (file instanceof File) {
                    URL.revokeObjectURL(URL.createObjectURL(file))
                }
            })
            imageFiles.forEach((file) => {
                if (file instanceof File) {
                    URL.revokeObjectURL(URL.createObjectURL(file))
                }
            })
        }
    }, [voiceFiles, imageFiles])

    const requestVoiceRecordingSlot = (): boolean => {
        if (voiceFiles.length >= MAX_VOICE_FILES) {
            onError('voiceFiles', `Maximum ${MAX_VOICE_FILES} voice recordings allowed`)
            return false
        }
        return true
    }

    const appendVoiceFile = (file: File) => {
        setVoiceFiles((prev) => [...prev, file])
    }

    const addImageFiles = (files: File[]) => {
        if (files.length + imageFiles.length > MAX_IMAGE_FILES) {
            onError('imageFiles', `Maximum ${MAX_IMAGE_FILES} images allowed`)
            return
        }
        setImageFiles((prev) => [...prev, ...files])
    }

    const addLibraryImage = (image: AssociativeImage) => {
        if (imageFiles.length >= MAX_IMAGE_FILES) {
            onError('imageFiles', `Maximum ${MAX_IMAGE_FILES} images allowed`)
            return
        }
        if (imageFiles.some((f) => isAttachmentFile(f) && f.id === image.fileId)) return
        const attachmentFile: AttachmentFile = {
            id: image.fileId,
            url: image.imageUrl,
            originalName: image.name,
            mimeType: 'image/png',
            size: 0,
        }
        setImageFiles((prev) => [...prev, attachmentFile])
    }

    const toggleFileRemoval = (file: AttachmentFileInput) => {
        if (isAttachmentFile(file)) {
            setRemovedFileIds((prev) => {
                const next = new Set(prev)
                if (next.has(file.id)) {
                    next.delete(file.id)
                } else {
                    next.add(file.id)
                }
                return next
            })
        } else {
            // For new files (File objects), just remove from the list
            setVoiceFiles((prev) => prev.filter((f) => f !== file))
            setImageFiles((prev) => prev.filter((f) => f !== file))
        }
    }

    const isFileMarkedForRemoval = (file: AttachmentFileInput): boolean => {
        return isAttachmentFile(file) && removedFileIds.has(file.id)
    }

    return {
        voiceFiles,
        imageFiles,
        removedFileIds: Array.from(removedFileIds),
        requestVoiceRecordingSlot,
        appendVoiceFile,
        addImageFiles,
        addLibraryImage,
        toggleFileRemoval,
        isFileMarkedForRemoval,
    }
}
