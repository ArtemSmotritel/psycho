import { Video, Edit, User, Trash2, LogIn, Play } from 'lucide-react'
import { SessionForm } from '@/components/SessionForm'
import { ConfirmAction } from '@/components/ConfirmAction'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { useCurrentAppointment } from '~/hooks/useCurrentAppointment'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { appointmentService } from '~/services/appointment.service'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function Session() {
    const { appointment, isLoading } = useCurrentAppointment()
    const { userRole } = useRoleGuard(['psychologist', 'client'])
    const navigate = useNavigate()
    const { role, clientId } = useParams<{ role: string; clientId: string }>()

    const [isStarting, setIsStarting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [startError, setStartError] = useState<{
        message: string
        activeAppointmentId: string
    } | null>(null)

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment) {
        return <p>Appointment not found.</p>
    }

    if (appointment.status === 'past') {
        return <p>This is a past appointment. Detail view coming in EDG-21.</p>
    }

    if (appointment.status === 'active') {
        return (
            <Link
                to={`/${role}/clients/${appointment.clientId}/appointments/${appointment.id}/live`}
            >
                <Button>Go to Active Appointment</Button>
            </Link>
        )
    }

    // upcoming
    const handleStartAppointment = async () => {
        if (!appointment) return
        setIsStarting(true)
        setStartError(null)
        try {
            await appointmentService.start(appointment.clientId, appointment.id)
            navigate(`/${role}/clients/${appointment.clientId}/appointments/${appointment.id}/live`)
        } catch (err: any) {
            const errorCode = err?.response?.data?.error
            if (errorCode === 'AnotherAppointmentActive') {
                setStartError({
                    message: err.response.data.message,
                    activeAppointmentId: err.response.data.activeAppointmentId,
                })
            } else {
                toast.error('Failed to start appointment. Please try again.')
            }
        } finally {
            setIsStarting(false)
        }
    }

    const handleDeleteAppointment = async () => {
        if (!appointment) return
        setIsDeleting(true)
        try {
            await appointmentService.delete(appointment.clientId, appointment.id)
            toast.success('Appointment deleted.')
            navigate(`/${role}/clients/${appointment.clientId}/appointments`)
        } catch {
            toast.error('Failed to delete appointment. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const formattedStart = format(new Date(appointment.startTime), 'HH:mm')
    const formattedEnd = format(new Date(appointment.endTime), 'HH:mm')

    return (
        <>
            <h2 className="text-xl font-semibold mb-1">{formattedDate}</h2>
            <p className="text-muted-foreground mb-4">
                {formattedStart} – {formattedEnd}
            </p>

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

            {startError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Cannot Start Appointment</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">{startError.message}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                navigate(
                                    `/${role}/clients/${clientId}/appointments/${startError.activeAppointmentId}`,
                                )
                            }
                        >
                            Go to active appointment
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <ActionsSection title="Actions">
                {userRole === 'psychologist' && (
                    <ActionItem
                        icon={<Play className="h-6" />}
                        label="Start Appointment"
                        variant="default"
                        onClick={handleStartAppointment}
                        disabled={isStarting}
                    />
                )}

                {userRole === 'psychologist' && (
                    <SessionForm
                        mode="edit"
                        trigger={
                            <ActionItem icon={<Edit className="h-6" />} label="Edit Appointment" />
                        }
                        initialData={{
                            startTime: new Date(appointment.startTime),
                            clientId: appointment.clientId,
                            googleMeetLink: appointment.googleMeetLink ?? undefined,
                        }}
                        isLoading={isUpdating}
                        onSubmit={async (values) => {
                            setIsUpdating(true)
                            try {
                                const dto = {
                                    startTime: values.startTime.toISOString(),
                                    endTime: values.endTime.toISOString(),
                                    googleMeetLink: values.googleMeetLink || null,
                                }
                                await appointmentService.update(
                                    appointment.clientId,
                                    appointment.id,
                                    dto,
                                )
                                toast.success('Appointment updated.')
                            } catch {
                                toast.error('Failed to update appointment. Please try again.')
                            } finally {
                                setIsUpdating(false)
                            }
                        }}
                    />
                )}

                {appointment.googleMeetLink && (
                    <ActionItem
                        icon={<LogIn className="h-6" />}
                        label="Join Call"
                        href={appointment.googleMeetLink}
                    />
                )}

                <ActionItem
                    icon={<User className="h-6" />}
                    label="Visit Client Profile"
                    to={`/${role}/clients/${appointment.clientId}`}
                />

                {userRole === 'psychologist' && (
                    <ConfirmAction
                        trigger={
                            <ActionItem
                                icon={<Trash2 className="h-6" />}
                                label="Delete Appointment"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                disabled={isDeleting}
                            />
                        }
                        title="Delete Appointment"
                        description="Are you sure you want to delete this appointment? This action cannot be undone."
                        confirmText="Delete"
                        onConfirm={handleDeleteAppointment}
                    />
                )}
            </ActionsSection>
        </>
    )
}
