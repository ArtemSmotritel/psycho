import { Video, LogIn } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { AppPageHeader } from '~/components/AppPageHeader'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { useCurrentClientAppointment } from '~/hooks/useCurrentClientAppointment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { format } from 'date-fns'
import { impressionService } from '~/services/impression.service'
import { recommendationService } from '~/services/recommendation.service'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'
import { RecommendationCard } from '~/components/RecommendationCard'
import { ImpressionList } from '~/components/ImpressionList'
import { ImpressionForm } from '~/components/ImpressionForm'
import { toast } from 'sonner'

export default function ClientAppointmentDetail() {
    useRoleGuard(['client'])

    const { appointmentId } = useParams<{ appointmentId: string }>()
    const { appointment, isLoading } = useCurrentClientAppointment()

    const [impressions, setImpressions] = useState<Attachment[]>([])
    const [isLoadingImpressions, setIsLoadingImpressions] = useState(false)
    const [isSubmittingImpression, setIsSubmittingImpression] = useState(false)
    const [recommendations, setRecommendations] = useState<AttachmentWithReaction[]>([])
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

    useEffect(() => {
        if (!appointmentId || !appointment || appointment.status !== 'past') return
        setIsLoadingImpressions(true)
        impressionService
            .getClientList(appointmentId)
            .then((res) => {
                setImpressions(res.data.impressions)
            })
            .catch(() => {
                // Silently ignore
            })
            .finally(() => {
                setIsLoadingImpressions(false)
            })
    }, [appointmentId, appointment])

    useEffect(() => {
        if (!appointmentId || !appointment || appointment.status !== 'past') return
        setIsLoadingRecommendations(true)
        recommendationService
            .getClientList(appointmentId)
            .then((res) => {
                setRecommendations(res.data.recommendations)
            })
            .catch(() => {
                // Silently ignore
            })
            .finally(() => {
                setIsLoadingRecommendations(false)
            })
    }, [appointmentId, appointment])

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment) {
        return <p>Appointment not found.</p>
    }

    if (appointment.status === 'past') {
        const pastFormattedDate = format(new Date(appointment.startTime), 'PPP')
        const pastFormattedStart = format(new Date(appointment.startTime), 'HH:mm')
        const pastFormattedEnd = format(new Date(appointment.endTime), 'HH:mm')
        return (
            <div className="container mx-auto p-4">
                <AppPageHeader text="Appointment" linkTo="/client/appointments" />
                <h2 className="text-xl font-semibold mb-1">{pastFormattedDate}</h2>
                <p className="text-muted-foreground mb-4">
                    {pastFormattedStart} – {pastFormattedEnd}
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

                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">My Impressions</h3>
                    <ImpressionList impressions={impressions} isLoading={isLoadingImpressions} />
                    <ImpressionForm
                        isSubmitting={isSubmittingImpression}
                        onSubmit={async (text) => {
                            if (!appointmentId) return
                            setIsSubmittingImpression(true)
                            try {
                                const res = await impressionService.submit(appointmentId, { text })
                                setImpressions((prev) => [...prev, res.data.impression])
                            } catch {
                                toast.error('Failed to submit impression. Please try again.')
                            } finally {
                                setIsSubmittingImpression(false)
                            }
                        }}
                    />
                </div>
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Recommendations</h3>
                    {isLoadingRecommendations ? (
                        <div
                            data-testid="loading-spinner"
                            className="flex items-center justify-center py-4"
                        >
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                        </div>
                    ) : recommendations.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No recommendations yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recommendations.map((recommendation) => (
                                <RecommendationCard
                                    key={recommendation.id}
                                    recommendation={recommendation}
                                    role="client"
                                    onToggleDone={async (id, done) => {
                                        if (!appointmentId) return
                                        try {
                                            await recommendationService.react(appointmentId, id, {
                                                done,
                                            })
                                            const res =
                                                await recommendationService.getClientList(
                                                    appointmentId,
                                                )
                                            setRecommendations(res.data.recommendations)
                                        } catch {
                                            toast.error('Failed to update. Please try again.')
                                        }
                                    }}
                                    onSubmitComment={async (id, comment) => {
                                        if (!appointmentId) return
                                        try {
                                            await recommendationService.react(appointmentId, id, {
                                                comment,
                                            })
                                            const res =
                                                await recommendationService.getClientList(
                                                    appointmentId,
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
            </div>
        )
    }

    if (appointment.status === 'active') {
        return <Navigate to={`/client/appointments/${appointmentId}/live`} replace />
    }

    // upcoming
    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const formattedStart = format(new Date(appointment.startTime), 'HH:mm')
    const formattedEnd = format(new Date(appointment.endTime), 'HH:mm')

    return (
        <div className="container mx-auto p-4">
            <AppPageHeader text="Appointment" linkTo="/client/appointments" />
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
        </div>
    )
}
