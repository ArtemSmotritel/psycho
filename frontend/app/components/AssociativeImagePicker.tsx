import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '~/components/ui/dialog'
import { useState } from 'react'
import { AssociativeImageBrowser } from './AssociativeImageBrowser'
import { useAssociativeImageBrowser } from '~/hooks/useAssociativeImageBrowser'
import type { AssociativeImage } from '~/models/associative-image'

interface AssociativeImagePickerProps {
    trigger: React.ReactNode
    onSelect: (image: AssociativeImage) => void
}

export function AssociativeImagePicker({ trigger, onSelect }: AssociativeImagePickerProps) {
    const [open, setOpen] = useState(false)
    const browser = useAssociativeImageBrowser({ enabled: open })

    const handleSelect = (image: AssociativeImage) => {
        onSelect(image)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select from Library</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 space-y-4">
                    <AssociativeImageBrowser
                        browser={browser}
                        renderItem={(image) => (
                            <button
                                key={image.id}
                                type="button"
                                className="group border rounded-md p-2 hover:border-primary hover:bg-accent transition-colors text-left"
                                onClick={() => handleSelect(image)}
                            >
                                <div className="aspect-square overflow-hidden rounded-md mb-1">
                                    <img
                                        src={image.imageUrl}
                                        alt={image.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <p className="text-xs font-medium truncate">{image.name}</p>
                            </button>
                        )}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
