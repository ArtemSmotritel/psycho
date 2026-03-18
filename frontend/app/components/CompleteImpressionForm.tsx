import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const formSchema = z.object({
    response: z.string().min(1, 'Response is required'),
})

type FormValues = z.infer<typeof formSchema>

interface CompleteImpressionFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (values: FormValues) => Promise<void>
}

export function CompleteImpressionForm({ isOpen, onClose, onSubmit }: CompleteImpressionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            response: '',
        },
    })

    const handleSubmit = async (values: FormValues) => {
        setIsSubmitting(true)
        try {
            await onSubmit(values)
            form.reset()
            onClose()
        } catch {
            toast.error('Failed to complete impression. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Impression</DialogTitle>
                    <DialogDescription>
                        Please provide your response to complete this impression.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="response" className="text-sm font-medium">
                            Response
                        </label>
                        <Textarea
                            id="response"
                            placeholder="Enter your response..."
                            disabled={isSubmitting}
                            {...form.register('response')}
                        />
                        {form.formState.errors.response && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.response.message}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Complete
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
