import { Video, Edit, User, Trash2, LogIn, Play } from 'lucide-react'
import { SessionForm } from '@/components/SessionForm'
import { ConfirmDeleteButton } from '~/components/common/ConfirmDeleteButton'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { useCurrentAppointment } from '~/hooks/useCurrentAppointment'
import { Link, useNavigate, useParams } from 'react-router'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { appointmentService } from '~/services/appointment.service'
import { attachmentService } from '~/services/attachment.service'
import { toast } from 'sonner'
import { logIfNotProd } from '~/utils/logger'
import { isAxiosError } from 'axios'
import { PingConflictError, type PingConflict } from '~/components/PingConflictDialog'
import { format } from 'date-fns'
import { formatAppointmentTimeRange } from '~/utils/utils'
import { routes } from '~/lib/routes'
import { AppointmentNotesPanel } from '~/components/attachments/notes/AppointmentNotesPanel'
import { AppointmentRecommendationsPanel } from '~/components/attachments/recommendations/AppointmentRecommendationsPanel'
import { AttachmentList } from '~/components/attachments/AttachmentList'
import { AttachmentListItem } from '~/components/attachments/AttachmentListItem'
import type { Attachment } from '~/models/attachment'
import { AppointmentStatusBadge } from '~/components/AppointmentStatusBadge'
import { Loading } from '~/components/common/Loading'
import { NotFound } from '~/components/common/NotFound'
import { WhiteboardSnapshot } from '~/components/whiteboard/WhiteboardSnapshot'
import { PostSessionFollowUpDialog } from '~/components/PostSessionFollowUpDialog'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { isPostSessionPromptDone, isRecentlyEnded } from '~/utils/post-session-prompt'

export default function Session() {
    const { appointment, isLoading } = useCurrentAppointment()
    const navigate = useNavigate()
    const { clientId } = useParams<{ clientId: string }>()
    const client = useCurrentClient()

    const [isStarting, setIsStarting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [startError, setStartError] = useState<{
        message: string
        activeAppointmentId: string
    } | null>(null)
    const [impressions, setImpressions] = useState<Attachment[]>([])
    const [isLoadingImpressions, setIsLoadingImpressions] = useState(false)
    const [showFollowUp, setShowFollowUp] = useState(false)

    useEffect(() => {
        if (!appointment || appointment.status !== 'past' || !client) {
            return
        }
        if (!isRecentlyEnded(appointment.endedAt)) return
        if (isPostSessionPromptDone(appointment.id)) return
        if (client.nextAppointment !== null) return
        setShowFollowUp(true)
    }, [appointment, client])

    useEffect(() => {
        if (
            !appointment ||
            (appointment.status !== 'past' && appointment.status !== 'missed') ||
            !clientId
        )
            return
        setIsLoadingImpressions(true)
        attachmentService
            .listForPsycho(clientId, appointment.id, 'impression')
            .then((res) => {
                setImpressions(res.data.impressions)
            })
            .catch((err) => {
                logIfNotProd('[psycho-session] failed to load impressions', err)
                toast.error('Failed to load client impressions.')
            })
            .finally(() => {
                setIsLoadingImpressions(false)
            })
    }, [appointment, clientId])

    if (isLoading) {
        return <Loading text="Loading appointment..." />
    }

    if (!clientId) {
        return <NotFound title="Client not found." />
    }

    if (!appointment) {
        return <NotFound title="Appointment not found." />
    }

    if (appointment.status === 'past' || appointment.status === 'missed') {
        const pastFormattedDate = format(new Date(appointment.startTime), 'PPP')
        return (
            <>
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold">{pastFormattedDate}</h2>
                    <AppointmentStatusBadge status={appointment.status} />
                </div>
                <p className="text-muted-foreground mb-4">
                    {formatAppointmentTimeRange(appointment)}
                </p>
                <AppointmentNotesPanel clientId={clientId} appointmentId={appointment.id} />
                <WhiteboardSnapshot url={appointment.whiteboardSnapshotUrl} />
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Client Impressions</h3>
                    <AttachmentList
                        items={impressions}
                        isLoading={isLoadingImpressions}
                        loadingText="Loading impressions..."
                        emptyMessage="No impressions yet."
                        renderItem={(impression) => (
                            <AttachmentListItem
                                attachment={impression}
                                detailHref={routes.psycho.attachment(
                                    clientId,
                                    impression.appointmentId,
                                    impression.id,
                                )}
                            />
                        )}
                    />
                </div>
                <div className="mt-6">
                    <AppointmentRecommendationsPanel
                        clientId={clientId}
                        appointmentId={appointment.id}
                    />
                </div>
                {showFollowUp && (
                    <PostSessionFollowUpDialog
                        endedAppointment={appointment}
                        open={true}
                        onClose={() => setShowFollowUp(false)}
                    />
                )}
            </>
        )
    }

    if (appointment.status === 'active') {
        return (
            <Link to={routes.psycho.appointmentLive(appointment.clientId, appointment.id)}>
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
            await appointmentService.startForPsycho(appointment.clientId, appointment.id)
            navigate(routes.psycho.appointmentLive(appointment.clientId, appointment.id))
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
            await appointmentService.deleteForPsycho(appointment.clientId, appointment.id)
            toast.success('Appointment deleted.')
            navigate(routes.psycho.clientAppointments(appointment.clientId))
        } catch {
            toast.error('Failed to delete appointment. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')

    return (
        <>
            <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold">{formattedDate}</h2>
                <AppointmentStatusBadge status={appointment.status} />
            </div>
            <p className="text-muted-foreground mb-4">{formatAppointmentTimeRange(appointment)}</p>

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
                                    `/psycho/clients/${clientId}/appointments/${startError.activeAppointmentId}`,
                                )
                            }
                        >
                            Go to active appointment
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <ActionsSection title="Actions">
                <ActionItem
                    icon={<Play className="h-6" />}
                    label="Start Appointment"
                    variant="default"
                    onClick={handleStartAppointment}
                    disabled={isStarting}
                />

                {appointment.status === 'upcoming' && (
                    <SessionForm
                        mode="edit"
                        trigger={
                            <ActionItem icon={<Edit className="h-6" />} label="Edit Appointment" />
                        }
                        initialData={{
                            startTime: new Date(appointment.startTime),
                            endTime: new Date(appointment.endTime),
                            clientId: appointment.clientId,
                            googleMeetLink: appointment.googleMeetLink ?? undefined,
                        }}
                        isLoading={isUpdating}
                        onSubmit={async (values, options) => {
                            setIsUpdating(true)
                            try {
                                const dto = {
                                    startTime: values.startTime.toISOString(),
                                    endTime: values.endTime.toISOString(),
                                    googleMeetLink: values.googleMeetLink || null,
                                    rescheduleGoogleMeet: values.rescheduleGoogleMeet ?? false,
                                    ...(options?.acknowledgePingConflict
                                        ? { acknowledgePingConflict: true }
                                        : {}),
                                }
                                const { data } = await appointmentService.updateForPsycho(
                                    appointment.clientId,
                                    appointment.id,
                                    dto,
                                )
                                if (data.meetRescheduleFailed) {
                                    toast.warning(
                                        'Appointment rescheduled, but the Google Meet event could not be updated. The old link may still work — you can add a new one manually.',
                                    )
                                } else {
                                    toast.success('Appointment updated.')
                                }
                            } catch (err) {
                                if (
                                    isAxiosError(err) &&
                                    err.response?.status === 409 &&
                                    err.response.data?.error === 'PingConflict'
                                ) {
                                    const conflictingPings: PingConflict[] =
                                        err.response.data.conflictingPings ?? []
                                    throw new PingConflictError(conflictingPings)
                                }
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
                    to={routes.psycho.client(appointment.clientId)}
                />

                {appointment.status === 'upcoming' && (
                    <ConfirmDeleteButton
                        itemLabel="Appointment"
                        description="Deleting this appointment will also remove any notes, impressions, and recommendations attached to it. This action cannot be undone."
                        trigger={
                            <ActionItem
                                icon={<Trash2 className="h-6" />}
                                label="Delete Appointment"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                disabled={isDeleting}
                            />
                        }
                        onConfirm={handleDeleteAppointment}
                    />
                )}
            </ActionsSection>
        </>
    )
}
