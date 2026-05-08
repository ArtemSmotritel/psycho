import { Video, LogIn } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { useCurrentClientAppointment } from '~/hooks/useCurrentClientAppointment'
import { format } from 'date-fns'
import { formatAppointmentTimeRange } from '~/utils/utils'
import { recommendationService } from '~/services/recommendation.service'
import { attachmentService } from '~/services/attachment.service'
import { resolveAttachmentFileIds } from '~/services/file.service'
import { routes } from '~/lib/routes'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'
import { RecommendationCard } from '~/components/RecommendationCard'
import { ImpressionList } from '~/components/ImpressionList'
import { AttachmentForm, type AttachmentFormSubmitValues } from '~/components/AttachmentForm'
import { toast } from 'sonner'
import { logIfNotProd } from '~/utils/logger'
import { AppointmentStatusBadge } from '~/components/AppointmentStatusBadge'
import { EmptyMessage } from '~/components/EmptyMessage'
import { NotFound } from '~/components/NotFound'
import { Loading } from '~/components/Loading'
import { WhiteboardSnapshot } from '~/components/WhiteboardSnapshot'

export default function ClientAppointmentDetail() {
    const { appointmentId } = useParams<{ appointmentId: string }>()
    const { appointment, isLoading } = useCurrentClientAppointment()

    const [impressions, setImpressions] = useState<Attachment[]>([])
    const [isLoadingImpressions, setIsLoadingImpressions] = useState(false)
    const [recommendations, setRecommendations] = useState<AttachmentWithReaction[]>([])
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

    const handleCreateImpression = async (values: AttachmentFormSubmitValues) => {
        if (!appointmentId) return
        try {
            const { audioFileIds, imageFileIds } = await resolveAttachmentFileIds(values)

            const res = await attachmentService.createForClient(appointmentId, {
                type: 'impression',
                name: values.name,
                text: values.text,
                imageFileIds,
                audioFileIds,
            })
            setImpressions((prev) => [...prev, res.data.attachment])
        } catch {
            toast.error('Failed to submit impression. Please try again.')
        }
    }

    useEffect(() => {
        if (
            !appointmentId ||
            !appointment ||
            (appointment.status !== 'past' && appointment.status !== 'missed')
        )
            return
        setIsLoadingImpressions(true)
        setIsLoadingRecommendations(true)
        attachmentService
            .listForClient(appointmentId)
            .then((res) => {
                setImpressions(res.data.impressions)
                setRecommendations(res.data.recommendations)
            })
            .catch((err) => {
                logIfNotProd('[appointment-detail] failed to load attachments', err)
                toast.error('Failed to load appointment details.')
            })
            .finally(() => {
                setIsLoadingImpressions(false)
                setIsLoadingRecommendations(false)
            })
    }, [appointmentId, appointment])

    if (isLoading) {
        return <Loading text="Loading appointment..." />
    }

    if (!appointmentId) {
        return (
            <PageContainer>
                <NotFound title="Appointment not found." />
            </PageContainer>
        )
    }

    if (!appointment) {
        return <NotFound title="Appointment not found." />
    }

    if (appointment.status === 'past' || appointment.status === 'missed') {
        const pastFormattedDate = format(new Date(appointment.startTime), 'PPP')
        return (
            <PageContainer>
                <AppPageHeader text="Appointment" linkTo={routes.client.appointments} />
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold">{pastFormattedDate}</h2>
                    <AppointmentStatusBadge status={appointment.status} />
                </div>
                <p className="text-muted-foreground mb-4">
                    {formatAppointmentTimeRange(appointment)}
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

                <WhiteboardSnapshot url={appointment.whiteboardSnapshotUrl} />

                <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">My Impressions</h3>
                        <AttachmentForm
                            type="impression"
                            mode="create"
                            trigger={<Button size="sm">Add Impression</Button>}
                            onSubmit={handleCreateImpression}
                        />
                    </div>
                    <ImpressionList
                        impressions={impressions}
                        isLoading={isLoadingImpressions}
                        clientLinks
                    />
                </div>
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Recommendations</h3>
                    {isLoadingRecommendations ? (
                        <Loading text="Loading recommendations..." />
                    ) : recommendations.length === 0 ? (
                        <EmptyMessage title="No recommendations yet." />
                    ) : (
                        <div className="space-y-3">
                            {recommendations.map((recommendation) => (
                                <RecommendationCard
                                    key={recommendation.id}
                                    recommendation={recommendation}
                                    role="client"
                                    detailHref={routes.client.attachment(
                                        appointmentId,
                                        recommendation.id,
                                    )}
                                    onToggleDone={async (id, done) => {
                                        if (!appointmentId) return
                                        try {
                                            await recommendationService.reactForClient(
                                                appointmentId,
                                                id,
                                                {
                                                    done,
                                                },
                                            )
                                            const res = await attachmentService.listForClient(
                                                appointmentId,
                                                'recommendation',
                                            )
                                            setRecommendations(res.data.recommendations)
                                        } catch {
                                            toast.error('Failed to update. Please try again.')
                                        }
                                    }}
                                    onSubmitComment={async (id, comment) => {
                                        if (!appointmentId) return
                                        try {
                                            await recommendationService.reactForClient(
                                                appointmentId,
                                                id,
                                                {
                                                    comment,
                                                },
                                            )
                                            const res = await attachmentService.listForClient(
                                                appointmentId,
                                                'recommendation',
                                            )
                                            setRecommendations(res.data.recommendations)
                                        } catch {
                                            toast.error(
                                                'Failed to submit comment. Please try again.',
                                            )
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PageContainer>
        )
    }

    if (appointment.status === 'active') {
        return <Navigate to={routes.client.appointmentLive(appointmentId)} replace />
    }

    // upcoming
    const formattedDate = format(new Date(appointment.startTime), 'PPP')

    return (
        <PageContainer>
            <AppPageHeader text="Appointment" linkTo={routes.client.appointments} />
            <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold">{formattedDate}</h2>
                <AppointmentStatusBadge status={appointment.status} />
            </div>
            <p className="text-muted-foreground mb-4">{formatAppointmentTimeRange(appointment)}</p>
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
        </PageContainer>
    )
}
