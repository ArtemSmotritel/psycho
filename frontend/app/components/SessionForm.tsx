import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { useClientList } from '~/hooks/useClientList'
import { usePingConflictSubmit } from '~/hooks/usePingConflictSubmit'
import { useControlledOpen } from '~/hooks/useControlledOpen'
import { PingConflictDialog } from '@/components/PingConflictDialog'
import {
    sessionFormSchema,
    type SessionFormProps,
    type SessionFormSubmit,
    type SessionFormValues,
} from './session-form/schema'
import { SessionDateTimePicker } from './session-form/SessionDateTimePicker'
import { SessionClientSelector } from './session-form/SessionClientSelector'
import { SessionGoogleMeetFields } from './session-form/SessionGoogleMeetFields'

export type { SessionFormSubmit }

export function SessionForm({
    mode,
    trigger,
    initialData,
    onSubmit,
    isLoading,
    open: externalOpen,
    onOpenChange,
    title,
    description,
    cancelLabel,
    submitLabel,
}: SessionFormProps) {
    const [open, setOpen] = useControlledOpen(externalOpen, onOpenChange)
    const currentClient = useCurrentClient()
    const clients = useClientList()

    // Ping-for-session feature (docs/feature-3-implementation-plan.md) — the
    // backend half is not implemented, so `pingConflict` will never become
    // non-null and `PingConflictDialog` below never opens. Wired up in advance
    // so no changes are needed here once Feature 3 ships.
    const { pingConflict, submit, confirmConflict, resetConflict } =
        usePingConflictSubmit<SessionFormValues>({
            onSubmit,
            onFinish: () => setOpen(false),
        })

    const defaultStart = (() => {
        const d = new Date()
        d.setMinutes(0, 0, 0)
        d.setHours(d.getHours() + 1)
        return d
    })()
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)

    const form = useForm<SessionFormValues>({
        resolver: zodResolver(sessionFormSchema),
        defaultValues: {
            startTime: defaultStart,
            endTime: defaultEnd,
            clientId: currentClient?.id || '',
            generateGoogleMeet: true,
            ...initialData,
        },
    })

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {title ??
                                (mode === 'add' ? 'Schedule New Appointment' : 'Edit Appointment')}
                        </DialogTitle>
                        <DialogDescription>
                            {description ??
                                (mode === 'add'
                                    ? 'Schedule a new appointment with your client'
                                    : 'Update appointment details')}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
                            <SessionDateTimePicker
                                control={form.control}
                                name="startTime"
                                label="Start Time"
                            />
                            <SessionDateTimePicker
                                control={form.control}
                                name="endTime"
                                label="End Time"
                            />
                            <SessionClientSelector form={form} clients={clients} />
                            <SessionGoogleMeetFields
                                control={form.control}
                                mode={mode}
                                hasExistingMeetLink={Boolean(initialData?.googleMeetLink)}
                            />

                            <div className="flex justify-end space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    {cancelLabel ?? 'Cancel'}
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? 'Saving…'
                                        : (submitLabel ??
                                          (mode === 'add'
                                              ? 'Schedule Appointment'
                                              : 'Save Changes'))}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <PingConflictDialog
                open={pingConflict !== null}
                onOpenChange={(next) => {
                    if (!next) resetConflict()
                }}
                conflictingPings={pingConflict ?? []}
                onConfirm={confirmConflict}
            />
        </>
    )
}
