import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { AssociativeImageBrowser } from '../AssociativeImageBrowser'
import { useAssociativeImageBrowser } from '~/hooks/useAssociativeImageBrowser'
import type { AssociativeImage } from '~/models/associative-image'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

interface WhiteboardImageInsertProps {
    excalidrawAPI: ExcalidrawImperativeAPI | null
}

async function insertImageOntoCanvas(
    image: AssociativeImage,
    api: ExcalidrawImperativeAPI,
): Promise<void> {
    const response = await fetch(image.imageUrl, { credentials: 'include' })
    const blob = await response.blob()

    const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.src = dataURL
    })

    const MAX_DIM = 400
    const scale = Math.min(MAX_DIM / dimensions.width, MAX_DIM / dimensions.height, 1)
    const width = dimensions.width * scale
    const height = dimensions.height * scale

    const fileId = `assoc-${image.id}-${Date.now()}`

    api.addFiles([
        {
            id: fileId as any,
            dataURL: dataURL as any,
            mimeType: blob.type as any,
            created: Date.now(),
        },
    ])

    const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
    const newElements = convertToExcalidrawElements([
        {
            type: 'image' as const,
            x: 100,
            y: 100,
            width,
            height,
            fileId: fileId as any,
        },
    ])

    api.updateScene({
        elements: [...api.getSceneElements(), ...newElements],
    })
}

export function WhiteboardImageInsert({ excalidrawAPI }: WhiteboardImageInsertProps) {
    const browser = useAssociativeImageBrowser()
    const [insertingId, setInsertingId] = useState<string | null>(null)

    const handleInsert = async (image: AssociativeImage) => {
        if (!excalidrawAPI) {
            toast.error('Whiteboard is not ready yet.')
            return
        }
        setInsertingId(image.id)
        try {
            await insertImageOntoCanvas(image, excalidrawAPI)
            toast.success(`Inserted "${image.name}" onto the whiteboard.`)
        } catch {
            toast.error('Failed to insert image.')
        } finally {
            setInsertingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <AssociativeImageBrowser
                browser={browser}
                gridClassName="grid grid-cols-2 gap-3"
                emptyDescription="Add images from the Associative Images page first."
                renderItem={(image) => (
                    <div key={image.id} className="border rounded-md p-2 space-y-2">
                        <div className="aspect-square overflow-hidden rounded-md">
                            <img
                                src={image.imageUrl}
                                alt={image.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <p className="text-xs font-medium truncate">{image.name}</p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={!excalidrawAPI || insertingId === image.id}
                            onClick={() => handleInsert(image)}
                        >
                            {insertingId === image.id ? 'Inserting...' : 'Insert'}
                        </Button>
                    </div>
                )}
            />
        </div>
    )
}
