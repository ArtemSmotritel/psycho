import { Button } from '@/components/ui/button'
import { useObjectUrl } from '~/hooks/useObjectUrl'

interface ImagePreviewProps {
    src: string | File
    alt: string
    className?: string
}

export function ImagePreview({ src, alt, className = '' }: ImagePreviewProps) {
    const url = useObjectUrl(src)
    return (
        <div className="relative group aspect-square p-2">
            <img
                src={url}
                alt={alt}
                className={`w-full h-full object-contain rounded-lg ${className}`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => {
                        window.open(url, '_blank')
                    }}
                >
                    View Full Size
                </Button>
            </div>
        </div>
    )
}
