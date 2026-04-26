import { SessionForm } from '@/components/SessionForm'
import type { Appointment } from '~/models/appointment'
import { useCreateAppointment } from '~/hooks/useCreateAppointment'
import { nextSameWeekdayOccurrence } from '~/utils/next-occurrence'
import { markPostSessionPromptDone } from '~/utils/post-session-prompt'

interface PostSessionFollowUpDialogProps {
    endedAppointment: Appointment
    open: boolean
    onClose: () => void
}

export function PostSessionFollowUpDialog({
    endedAppointment,
    open,
    onClose,
}: PostSessionFollowUpDialogProps) {
    const { handleCreate, isCreating } = useCreateAppointment(() => {
        markPostSessionPromptDone(endedAppointment.id)
        onClose()
    })

    const { startTime, endTime } = nextSameWeekdayOccurrence(endedAppointment)

    const handleOpenChange = (next: boolean) => {
        if (next) return
        markPostSessionPromptDone(endedAppointment.id)
        onClose()
    }

    return (
        <SessionForm
            mode="add"
            open={open}
            onOpenChange={handleOpenChange}
            title="Schedule a follow-up"
            description="Would you like to schedule the next session with this client?"
            cancelLabel="Skip"
            submitLabel="Create"
            isLoading={isCreating}
            initialData={{
                startTime,
                endTime,
                clientId: endedAppointment.clientId,
                generateGoogleMeet: true,
            }}
            onSubmit={handleCreate}
        />
    )
}
