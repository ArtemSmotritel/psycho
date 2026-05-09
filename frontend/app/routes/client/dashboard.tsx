import { Link } from 'react-router'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { EmptyMessage } from '~/components/common/EmptyMessage'
import { Loading } from '~/components/common/Loading'
import { AttachmentList } from '~/components/AttachmentList'
import { AttachmentListItem } from '~/components/AttachmentListItem'
import { RecommendationReactionBlock } from '~/components/RecommendationReactionBlock'
import { useResource } from '~/hooks/useResource'
import { dashboardService } from '~/services/dashboard.service'
import { recommendationService } from '~/services/recommendation.service'
import { routes } from '~/lib/routes'
import { formatAppointmentDateTimeRange } from '~/utils/utils'
import type { ClientDashboardData } from '~/models/dashboard'

export default function ClientDashboard() {
    const {
        data,
        isLoading,
        error,
        refetch: fetchDashboard,
    } = useResource<ClientDashboardData>(
        () => dashboardService.getDashboardForClient().then((res) => res.data),
        [],
        { errorMessage: 'Failed to load dashboard data.' },
    )

    if (isLoading) {
        return (
            <PageContainer>
                <AppPageHeader text="Dashboard" />
                <Loading />
            </PageContainer>
        )
    }

    if (error) {
        return (
            <PageContainer>
                <AppPageHeader text="Dashboard" />
                <p className="text-destructive">{error}</p>
            </PageContainer>
        )
    }

    const {
        psychologists,
        activeAppointment,
        nextAppointment,
        pendingRecommendations,
        appointmentCounts,
    } = data!

    const handleToggleDoneForRec =
        (appointmentId: string) => async (attachmentId: string, done: boolean) => {
            try {
                await recommendationService.reactForClient(appointmentId, attachmentId, { done })
                await fetchDashboard()
            } catch {
                toast.error('Failed to update recommendation. Please try again.')
            }
        }

    const handleSubmitCommentForRec =
        (appointmentId: string) => async (attachmentId: string, comment: string) => {
            try {
                await recommendationService.reactForClient(appointmentId, attachmentId, { comment })
                await fetchDashboard()
            } catch {
                toast.error('Failed to submit comment. Please try again.')
            }
        }

    return (
        <PageContainer>
            <AppPageHeader text="Dashboard" />

            {activeAppointment !== null && (
                <div className="mb-6 rounded-lg border border-primary bg-primary/5 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Appointment</p>
                    <p className="mt-1 text-lg font-semibold">{activeAppointment.psychoName}</p>
                    <p className="text-sm text-muted-foreground">
                        {formatAppointmentDateTimeRange(activeAppointment)}
                    </p>
                    <Link
                        to={routes.client.appointmentLive(activeAppointment.id)}
                        className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2"
                    >
                        Join now
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-8">
                {/* My Psychologists */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Psychologists</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {psychologists.length === 0 ? (
                            <EmptyMessage title="No psychologists linked" />
                        ) : (
                            <div className="space-y-3">
                                {psychologists.map((p) => (
                                    <div key={p.id} className="flex items-center gap-3">
                                        {p.image ? (
                                            <img
                                                src={p.image}
                                                alt={p.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                                                {p.name?.charAt(0)?.toUpperCase() ?? '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {p.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Next Appointment */}
                <Card>
                    <CardHeader>
                        <CardTitle>Next Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextAppointment === null ? (
                            <EmptyMessage title="No upcoming appointments" />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {formatAppointmentDateTimeRange(nextAppointment)}
                                </p>
                                <p className="font-medium">{nextAppointment.psychoName}</p>
                                <p className="text-sm capitalize">{nextAppointment.status}</p>
                                <Link
                                    to={routes.client.appointment(nextAppointment.id)}
                                    className="text-sm underline"
                                >
                                    View appointment
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Recommendations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AttachmentList
                            items={pendingRecommendations}
                            emptyMessage="No pending recommendations"
                            renderItem={(rec) => (
                                <AttachmentListItem
                                    attachment={rec}
                                    detailHref={routes.client.attachment(rec.appointmentId, rec.id)}
                                    extra={
                                        <RecommendationReactionBlock
                                            role="client"
                                            reaction={rec.reaction}
                                            attachmentId={rec.id}
                                            onToggleDone={handleToggleDoneForRec(rec.appointmentId)}
                                            onSubmitComment={handleSubmitCommentForRec(
                                                rec.appointmentId,
                                            )}
                                        />
                                    }
                                />
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Appointments Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appointments Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 mb-4">
                            <p className="text-sm">
                                <span className="font-medium">Upcoming:</span>{' '}
                                {appointmentCounts.upcoming}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Active:</span>{' '}
                                {appointmentCounts.active}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Past:</span> {appointmentCounts.past}
                            </p>
                        </div>
                        <Link to={routes.client.appointments} className="text-sm underline">
                            View all appointments
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}
