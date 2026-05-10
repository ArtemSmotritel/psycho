import { Video, LogIn } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { useCurrentClientAppointment } from '~/hooks/useCurrentClientAppointment'
import { format } from 'date-fns'
import { formatAppointmentTimeRange } from '~/utils/utils'
import { recommendationService } from '~/services/recommendation.service'
import { attachmentService, getCreateAttachmentErrorMessage } from '~/services/attachment.service'
import { resolveAttachmentFileIds } from '~/services/file.service'
import { routes } from '~/lib/routes'
import { ATTACHMENT_LIMITS } from '~/lib/attachment-limits'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'
import { AttachmentList } from '~/components/attachments/AttachmentList'
import { AttachmentListItem } from '~/components/attachments/AttachmentListItem'
import { DeleteAttachmentButton } from '~/components/attachments/DeleteAttachmentButton'
import { RecommendationReactionBlock } from '~/components/attachments/recommendations/RecommendationReactionBlock'
import {
    AttachmentForm,
    type AttachmentFormSubmitValues,
} from '~/components/attachments/AttachmentForm'
import { toast } from 'sonner'
import { logIfNotProd } from '~/utils/logger'
import { AppointmentStatusBadge } from '~/components/AppointmentStatusBadge'
import { NotFound } from '~/components/common/NotFound'
import { Loading } from '~/components/common/Loading'
import { WhiteboardSnapshot } from '~/components/whiteboard/WhiteboardSnapshot'

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
        } catch (err) {
            toast.error(
                getCreateAttachmentErrorMessage(
                    err,
                    'Failed to submit impression. Please try again.',
                ),
            )
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
        return (
            <PageContainer>
                <AppPageHeader text="Appointment" linkTo={routes.client.appointments} />
                <Loading text="Loading appointment..." />
            </PageContainer>
        )
    }

    if (!appointmentId || !appointment) {
        return (
            <PageContainer>
                <AppPageHeader text="Appointment" linkTo={routes.client.appointments} />
                <NotFound title="Appointment not found." />
            </PageContainer>
        )
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
                        <h3 className="text-lg font-semibold">
                            My Impressions{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                {impressions.length}/{ATTACHMENT_LIMITS.impression}
                            </span>
                        </h3>
                        <AttachmentForm
                            type="impression"
                            mode="create"
                            trigger={
                                <Button
                                    size="sm"
                                    disabled={impressions.length >= ATTACHMENT_LIMITS.impression}
                                    title={
                                        impressions.length >= ATTACHMENT_LIMITS.impression
                                            ? `Maximum ${ATTACHMENT_LIMITS.impression} impressions per appointment reached.`
                                            : undefined
                                    }
                                >
                                    Add Impression
                                </Button>
                            }
                            onSubmit={handleCreateImpression}
                        />
                    </div>
                    <AttachmentList
                        items={impressions}
                        isLoading={isLoadingImpressions}
                        loadingText="Loading impressions..."
                        emptyMessage="No impressions yet."
                        renderItem={(impression) => (
                            <AttachmentListItem
                                attachment={impression}
                                detailHref={routes.client.attachment(
                                    impression.appointmentId,
                                    impression.id,
                                )}
                                trailingActions={
                                    <DeleteAttachmentButton
                                        appointmentId={appointmentId}
                                        attachment={impression}
                                        onSuccess={() =>
                                            setImpressions((prev) =>
                                                prev.filter((i) => i.id !== impression.id),
                                            )
                                        }
                                    />
                                }
                            />
                        )}
                    />
                </div>
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Recommendations</h3>
                    <AttachmentList
                        items={recommendations}
                        isLoading={isLoadingRecommendations}
                        loadingText="Loading recommendations..."
                        emptyMessage="No recommendations yet."
                        renderItem={(recommendation) => (
                            <AttachmentListItem
                                attachment={recommendation}
                                detailHref={routes.client.attachment(
                                    appointmentId,
                                    recommendation.id,
                                )}
                                extra={
                                    <RecommendationReactionBlock
                                        role="client"
                                        reaction={recommendation.reaction}
                                        attachmentId={recommendation.id}
                                        onToggleDone={async (id, done) => {
                                            try {
                                                await recommendationService.reactForClient(
                                                    appointmentId,
                                                    id,
                                                    { done },
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
                                            try {
                                                await recommendationService.reactForClient(
                                                    appointmentId,
                                                    id,
                                                    { comment },
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
                                }
                            />
                        )}
                    />
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
