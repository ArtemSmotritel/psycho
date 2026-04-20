import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import { ImpressionForm } from '~/components/ImpressionForm'
import { impressionService } from '~/services/impression.service'
import type { Attachment } from '~/models/attachment'

interface PostSessionImpressionDialogProps {
    open: boolean
    appointmentId: string
    onSubmitted: (impression: Attachment) => void
    onSkip: () => void
}

export function PostSessionImpressionDialog({
    open,
    appointmentId,
    onSubmitted,
    onSkip,
}: PostSessionImpressionDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (text: string) => {
        setIsSubmitting(true)
        try {
            const res = await impressionService.submit(appointmentId, { text })
            toast.success('Impression saved.')
            onSubmitted(res.data.impression)
        } catch {
            toast.error('Failed to submit impression. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Session Ended</DialogTitle>
                    <DialogDescription>
                        Your psychologist has ended the session. How did it feel? Share an
                        impression now or add one later from the summary.
                    </DialogDescription>
                </DialogHeader>
                <ImpressionForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
                <DialogFooter>
                    <Button variant="ghost" onClick={onSkip}>
                        Skip for now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
