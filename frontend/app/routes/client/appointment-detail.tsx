import { Video, LogIn } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { useCurrentClientAppointment } from '~/hooks/useCurrentClientAppointment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { format } from 'date-fns'

export default function ClientAppointmentDetail() {
    useRoleGuard(['client'])

    const { appointment, isLoading } = useCurrentClientAppointment()

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment) {
        return <p>Appointment not found.</p>
    }

    if (appointment.status === 'past') {
        return <p>This is a past appointment. Detail view coming in EDG-24.</p>
    }

    if (appointment.status === 'active') {
        return (
            <>
                <p>Your appointment is currently active.</p>
                {appointment.googleMeetLink && (
                    <ActionsSection title="Actions">
                        <ActionItem
                            icon={<LogIn className="h-6" />}
                            label="Join Call"
                            href={appointment.googleMeetLink}
                        />
                    </ActionsSection>
                )}
            </>
        )
    }

    // upcoming
    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const formattedStart = format(new Date(appointment.startTime), 'HH:mm')
    const formattedEnd = format(new Date(appointment.endTime), 'HH:mm')

    return (
        <>
            <h2 className="text-xl font-semibold mb-1">{formattedDate}</h2>
            <p className="text-muted-foreground mb-4">
                {formattedStart} – {formattedEnd}
            </p>
            <p className="text-muted-foreground mb-4">{appointment.psychoName}</p>

            <Alert className="mb-4">
                <Video className="text-primary" />
                <AlertTitle>Google Meet</AlertTitle>
                <AlertDescription>
                    {appointment.googleMeetLink ? (
                        <Link
                            to={appointment.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary underline"
                        >
                            {appointment.googleMeetLink}
                        </Link>
                    ) : (
                        <p className="text-sm text-muted-foreground">No Google Meet link</p>
                    )}
                </AlertDescription>
            </Alert>

            {appointment.googleMeetLink && (
                <ActionsSection title="Actions">
                    <ActionItem
                        icon={<LogIn className="h-6" />}
                        label="Join Call"
                        href={appointment.googleMeetLink}
                    />
                </ActionsSection>
            )}
        </>
    )
}
