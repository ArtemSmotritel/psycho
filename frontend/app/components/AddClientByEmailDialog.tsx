import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useState } from 'react'
import { clientService } from '~/services/client.service'

const formSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
})

type FormValues = z.infer<typeof formSchema>

interface AddClientByEmailDialogProps {
    trigger: React.ReactNode
    onSuccess: () => void
}

export function AddClientByEmailDialog({ trigger, onSuccess }: AddClientByEmailDialogProps) {
    const [open, setOpen] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
        },
    })

    const isSubmitting = form.formState.isSubmitting

    async function handleSubmit(values: FormValues) {
        setServerError(null)
        try {
            await clientService.addByEmail(values.email)
            form.reset()
            setOpen(false)
            onSuccess()
        } catch (err: any) {
            const errorCode = err?.response?.data?.error
            if (errorCode === 'ClientNotFound') {
                setServerError(
                    'No account found for this email. Ask your client to register first.',
                )
            } else if (errorCode === 'AlreadyLinked') {
                setServerError('This client is already in your list.')
            } else {
                setServerError('Something went wrong. Please try again.')
            }
        }
    }

    function handleOpenChange(next: boolean) {
        setOpen(next)
        if (!next) {
            form.reset()
            setServerError(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Client</DialogTitle>
                    <DialogDescription>
                        Enter your client&apos;s email address to add them to your list. They must
                        already have an account.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="client@example.com"
                                            type="email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {serverError && (
                            <p className="text-sm font-medium text-destructive">{serverError}</p>
                        )}
                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Client'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
