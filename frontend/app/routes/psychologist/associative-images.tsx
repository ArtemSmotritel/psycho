import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { Trash2, Save, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyMessage } from '~/components/EmptyMessage'
import { AddImageDialog } from '~/components/AddImageDialog'
import { ConfirmAction } from '~/components/ConfirmAction'
import { ImagePreview } from '~/components/ImagePreview'
import { ProtectedRoute } from '~/components/ProtectedRoute'
import { toast } from 'sonner'
import { associativeImageService } from '~/services/associative-image.service'
import { fileService } from '~/services/file.service'
import type { AssociativeImage } from '~/models/associative-image'

interface ImageCardProps {
    image: AssociativeImage
    onDelete: (id: string) => void
    onSaveEdit: (id: string, newName: string) => void
}

function ImageCard({ image, onDelete, onSaveEdit }: ImageCardProps) {
    const [editingName, setEditingName] = useState<{ id: string; name: string } | null>(null)

    const handleStartEdit = (currentName: string) => {
        setEditingName({ id: image.id, name: currentName })
    }

    const handleCancelEdit = () => {
        setEditingName(null)
    }

    const handleSaveEdit = () => {
        if (!editingName) return
        onSaveEdit(image.id, editingName.name)
        setEditingName(null)
    }

    return (
        <Card className="group">
            <CardHeader>
                <Input
                    value={editingName?.id === image.id ? editingName.name : image.name}
                    onChange={(e) => setEditingName({ id: image.id, name: e.target.value })}
                    onFocus={() => handleStartEdit(image.name)}
                    className="border-0 bg-transparent p-0 text-lg font-semibold focus-visible:ring-0"
                />
            </CardHeader>
            <CardContent>
                <ImagePreview src={image.imageUrl} alt={image.name} />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <ConfirmAction
                    trigger={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                        </Button>
                    }
                    title="Delete Image"
                    description="Are you sure you want to delete this image? This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={() => onDelete(image.id)}
                />
                {editingName?.id === image.id && (
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}

export default function AssociativeImages() {
    const [images, setImages] = useState<AssociativeImage[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        associativeImageService
            .getList()
            .then((res) => {
                setImages(res.data.images)
            })
            .catch(() => {
                toast.error('Failed to load images.')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    const handleAddImage = async (name: string, file: File) => {
        try {
            const uploadRes = await fileService.upload(file)
            const fileId = uploadRes.data.id
            const res = await associativeImageService.create({ name, fileId })
            setImages([res.data.image, ...images])
        } catch {
            toast.error('Failed to add image.')
        }
    }

    const handleDeleteImage = async (id: string) => {
        try {
            await associativeImageService.delete(id)
            setImages(images.filter((image) => image.id !== id))
        } catch {
            toast.error('Failed to delete image.')
        }
    }

    const handleSaveEdit = async (id: string, newName: string) => {
        try {
            const res = await associativeImageService.updateName(id, { name: newName })
            setImages(images.map((img) => (img.id === id ? res.data.image : img)))
        } catch {
            toast.error('Failed to rename image.')
        }
    }

    const filteredImages = images.filter((image) =>
        image.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
        <ProtectedRoute allowedRoles={['psychologist']}>
            <PageContainer>
                <AppPageHeader text="Associative Images" />

                <div className="flex flex-col sm:flex-row items-center gap-8 mb-6">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search images..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <AddImageDialog onAddImage={handleAddImage} />
                </div>

                {loading && <p className="text-muted-foreground">Loading...</p>}

                {!loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredImages.map((image) => (
                            <ImageCard
                                key={image.id}
                                image={image}
                                onDelete={handleDeleteImage}
                                onSaveEdit={handleSaveEdit}
                            />
                        ))}
                    </div>
                )}

                {!loading && images.length === 0 && (
                    <EmptyMessage title="No images" description="Add a new image to see it here" />
                )}
                {!loading && images.length > 0 && filteredImages.length === 0 && (
                    <EmptyMessage
                        title="No matches"
                        description="No images found matching your search"
                    />
                )}
            </PageContainer>
        </ProtectedRoute>
    )
}
