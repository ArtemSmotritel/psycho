import { Mic, Image as ImageIcon } from 'lucide-react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import { EmptyMessage } from '~/components/common/EmptyMessage'
import { ImagePreview } from '~/components/common/ImagePreview'
import type { AttachmentFile } from '~/models/attachment'

interface ImageAttachmentsProps {
    files: AttachmentFile[]
}

function ImageAttachments({ files }: ImageAttachmentsProps) {
    if (!files || files.length === 0) {
        return (
            <EmptyMessage
                title="No Images"
                description="This attachment doesn't have any images."
            />
        )
    }

    return (
        <Carousel
            className="w-full md:max-w-3xl lg:max-w-5xl max-w-xs"
            opts={{ loop: true, align: 'start' }}
        >
            <CarouselContent>
                {files.map((file, index) => (
                    <CarouselItem key={file.id} className="sm:basis-1/1 md:basis-1/2 lg:basis-1/3">
                        <ImagePreview src={file.url} alt={`Attachment image ${index + 1}`} />
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    )
}

interface VoiceAttachmentsProps {
    files: AttachmentFile[]
}

function VoiceAttachments({ files }: VoiceAttachmentsProps) {
    if (!files || files.length === 0) {
        return (
            <EmptyMessage
                title="No Voice Recordings"
                description="This attachment doesn't have any voice recordings."
            />
        )
    }

    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
                <div key={file.id} className="w-full max-w-md p-4 rounded-lg border">
                    <audio controls className="w-full">
                        <source src={file.url} type={file.mimeType || 'audio/wav'} />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            ))}
        </div>
    )
}

interface AttachmentMediaPreviewProps {
    audioFiles: AttachmentFile[]
    imageFiles: AttachmentFile[]
}

export function AttachmentMediaPreview({ audioFiles, imageFiles }: AttachmentMediaPreviewProps) {
    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Voice Recordings</h3>
                </div>
                <VoiceAttachments files={audioFiles} />
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Images</h3>
                </div>
                <div className="px-10">
                    <ImageAttachments files={imageFiles} />
                </div>
            </div>
        </>
    )
}
