import { Image as ImageIcon, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyMessage } from '../EmptyMessage'
import { AssociativeImagePicker } from '../AssociativeImagePicker'
import type { AssociativeImage } from '~/models/associative-image'
import { useObjectUrl } from '~/hooks/useObjectUrl'
import { MAX_IMAGE_FILES, isAttachmentFile, type AttachmentFileInput } from './schema'

interface ImageSectionProps {
    mode: 'create' | 'edit'
    imageFiles: AttachmentFileInput[]
    showLibraryPicker: boolean
    errorMessage?: string
    onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onLibraryImageSelect: (image: AssociativeImage) => void
    onToggleFileRemoval: (file: AttachmentFileInput) => void
    isFileMarkedForRemoval: (file: AttachmentFileInput) => boolean
}

export function ImageSection({
    mode,
    imageFiles,
    showLibraryPicker,
    errorMessage,
    onImageFileChange,
    onLibraryImageSelect,
    onToggleFileRemoval,
    isFileMarkedForRemoval,
}: ImageSectionProps) {
    return (
        <>
            <div className="flex items-center gap-4 flex-wrap">
                <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => document.getElementById('image-input')?.click()}
                    disabled={mode === 'edit' || imageFiles.length >= MAX_IMAGE_FILES}
                >
                    <ImageIcon className="h-4 w-4" />
                    Upload Images
                    <input
                        id="image-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onImageFileChange}
                        multiple
                    />
                </Button>
                {showLibraryPicker && (
                    <AssociativeImagePicker
                        trigger={
                            <Button
                                type="button"
                                variant="outline"
                                className="flex items-center gap-2"
                                disabled={imageFiles.length >= MAX_IMAGE_FILES}
                            >
                                <Library className="h-4 w-4" />
                                From Library
                            </Button>
                        }
                        onSelect={onLibraryImageSelect}
                    />
                )}
                <span className="text-sm text-muted-foreground">
                    {imageFiles.length}/{MAX_IMAGE_FILES} images
                </span>
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            {imageFiles.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Images</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {imageFiles.map((file, index) => (
                            <ImagePreviewItem
                                key={index}
                                file={file}
                                index={index}
                                markedForRemoval={isFileMarkedForRemoval(file)}
                                onToggleFileRemoval={onToggleFileRemoval}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyMessage
                    title="No Images"
                    description="Upload images to add them here."
                    className="py-4"
                />
            )}
        </>
    )
}

interface ImagePreviewItemProps {
    file: AttachmentFileInput
    index: number
    markedForRemoval: boolean
    onToggleFileRemoval: (file: AttachmentFileInput) => void
}

function ImagePreviewItem({
    file,
    index,
    markedForRemoval,
    onToggleFileRemoval,
}: ImagePreviewItemProps) {
    const src = useObjectUrl(isAttachmentFile(file) ? file.url : file)
    return (
        <div className={`relative group ${markedForRemoval ? 'opacity-40' : ''}`}>
            <img
                src={src}
                alt={`Uploaded image ${index + 1}`}
                className="w-full h-24 object-cover rounded-md"
            />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                onClick={() => onToggleFileRemoval(file)}
            >
                {markedForRemoval ? 'Restore' : 'Remove'}
            </Button>
        </div>
    )
}
