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
import { invitationService } from '~/services/invitation.service'

const formSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
})

type FormValues = z.infer<typeof formSchema>

interface AddClientByEmailDialogProps {
    trigger: React.ReactNode
    onSuccess: () => void
}

type DialogState =
    | { type: 'form' }
    | { type: 'not-found'; email: string }
    | { type: 'invite-sending' }
    | { type: 'invite-sent'; inviteLink: string }

export function AddClientByEmailDialog({ trigger, onSuccess }: AddClientByEmailDialogProps) {
    const [open, setOpen] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [dialogState, setDialogState] = useState<DialogState>({ type: 'form' })
    const [copied, setCopied] = useState(false)

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
                setDialogState({ type: 'not-found', email: values.email })
            } else if (errorCode === 'AlreadyLinked') {
                setServerError('This client is already in your list.')
            } else {
                setServerError('Something went wrong. Please try again.')
            }
        }
    }

    async function handleSendInvitation(email: string) {
        setServerError(null)
        setDialogState({ type: 'invite-sending' })
        try {
            const res = await invitationService.create(email)
            setDialogState({ type: 'invite-sent', inviteLink: res.data.inviteLink })
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Failed to send invitation.'
            setServerError(message)
            setDialogState({ type: 'not-found', email })
        }
    }

    async function handleCopyLink(link: string) {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function handleOpenChange(next: boolean) {
        setOpen(next)
        if (!next) {
            form.reset()
            setServerError(null)
            setDialogState({ type: 'form' })
            setCopied(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Client</DialogTitle>
                    <DialogDescription>
                        {dialogState.type === 'invite-sent'
                            ? 'Share this link with your client so they can join.'
                            : "Enter your client's email address to add them to your list."}
                    </DialogDescription>
                </DialogHeader>

                {dialogState.type === 'form' && (
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
                                <p className="text-sm font-medium text-destructive">
                                    {serverError}
                                </p>
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
                )}

                {dialogState.type === 'not-found' && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            No account found for <strong>{dialogState.email}</strong>. Send them an
                            invitation link instead?
                        </p>
                        {serverError && (
                            <p className="text-sm font-medium text-destructive">{serverError}</p>
                        )}
                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setServerError(null)
                                    setDialogState({ type: 'form' })
                                }}
                            >
                                Back
                            </Button>
                            <Button onClick={() => handleSendInvitation(dialogState.email)}>
                                Send Invitation
                            </Button>
                        </div>
                    </div>
                )}

                {dialogState.type === 'invite-sending' && (
                    <div className="flex items-center justify-center py-6">
                        <p className="text-sm text-muted-foreground">Creating invitation...</p>
                    </div>
                )}

                {dialogState.type === 'invite-sent' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input readOnly value={dialogState.inviteLink} className="text-xs" />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => handleCopyLink(dialogState.inviteLink)}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Send this link to your client. They can use it to sign up and will be
                            automatically connected to you.
                        </p>
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
